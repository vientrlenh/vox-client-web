import { useCallback, useMemo } from 'react'

import type { ProctorCandidateSummaryDto } from '@/features/examCore/types'

import type { AlertView, StreamView } from '../api/useRoomMonitor'
import type { StreamType } from '../types'

/** Quá thời gian này mà không có frame mới thì coi như đứng hình (server sinh frame mỗi 5 giây). */
export const STALE_MS = 12_000

/**
 * Đứng hình quá lâu thì thôi gọi là đứng hình.
 *
 * <p>Tín hiệu "đã rời phòng" của vox-streaming đi một đường rất dài trước khi tới được đây: hết
 * grace period của peer, rồi cả khâu chốt/upload bản ghi, rồi mới qua Kafka và Redis pub/sub. Nó
 * có thể chậm hàng chục giây - và có thể KHÔNG BAO GIỜ tới, vì pub/sub là fire-and-forget còn
 * snapshot thì chỉ gửi đúng một lần lúc monitor kết nối.
 *
 * <p>Không có nấc này thì một học viên rớt mạng thật nằm ở "Đứng hình" tới hết ca thi, tức là màn
 * hình giám sát đang nói dối theo hướng trấn an - hướng nguy hiểm nhất mà nó có thể nói dối.
 */
export const STALE_LOST_MS = 45_000

/**
 * Phiên thi còn đang chạy. Ngoài hai giá trị này (SUBMITTED/GRADING/GRADED/EXPIRED/...) là phiên
 * đã đóng, và mọi thứ ngừng phát sau đó đều là chuyện bình thường chứ không phải sự cố.
 */
export const LIVE_SESSION_STATUSES = new Set(['IN_PROGRESS', 'INTERRUPTED'])

/**
 * Cảnh báo còn "nóng" trong bao lâu, tính theo mục đích sắp xếp.
 *
 * <p>Sau khoảng này nó vẫn nằm trong dòng cảnh báo để tra cứu, nhưng thôi đẩy học viên lên đầu
 * lưới - nếu không thì một cảnh báo lúc đầu giờ sẽ ghim học viên đó ở vị trí số một suốt ca thi và
 * làm hỏng chính cơ chế ưu tiên.
 */
export const ALERT_ATTENTION_MS = 60_000

export type StreamFilter = 'all' | StreamType

/**
 * Mức đáng chú ý của một học viên, xếp từ cần nhìn ngay tới bình thường. Thứ tự khai báo chính là
 * thứ tự ưu tiên hiển thị.
 */
export const PARTICIPANT_STATUS_ORDER = ['alerted', 'dropped', 'lost', 'stale', 'live', 'finished'] as const

export type ParticipantStatus = (typeof PARTICIPANT_STATUS_ORDER)[number]

export type ParticipantBoardEntry = {
    candidateId: string
    candidateStatus?: null | string
    /** Mọi stream của học viên, không lọc - dùng để đếm và để biết họ có những loại nào. */
    allStreams: StreamView[]
    /** Đã bị giám thị cấm (do buộc kết thúc) hay chưa - quyết định có cho hủy bài thi lần nữa không. */
    blockedAt?: null | string
    latestAlert?: AlertView
    sessionFlagged: boolean
    sessionId?: null | string
    /** Trạng thái phiên thi (IN_PROGRESS/INTERRUPTED/...) - chỉ phiên đang sống mới buộc kết thúc được. */
    sessionStatus?: null | string
    status: ParticipantStatus
    /** Stream sau khi áp bộ lọc mật độ; có thể rỗng nếu học viên không có loại đang chọn. */
    streams: StreamView[]
    studentEmail?: null | string
    studentName: string
}

function resolveStatus(
    streams: StreamView[],
    latestAlert: AlertView | undefined,
    sessionStatus: null | string | undefined,
    now: number,
): ParticipantStatus {
    if (latestAlert && now - latestAlert.receivedAt <= ALERT_ATTENTION_MS) {
        return 'alerted'
    }
    // Xét TRƯỚC cả 'dropped': với một phiên thi đã đóng thì luồng tắt là chuyện đúng, không phải sự
    // cố. Trước đây hàm này chỉ đọc luồng, nên học viên nộp bài xong vẫn tụt qua "Đứng hình" rồi
    // "Mất kết nối" và nằm đỏ tới hết ca - báo động cho đúng cái kết thúc bình thường nhất.
    if (sessionStatus && !LIVE_SESSION_STATUSES.has(sessionStatus)) {
        return 'finished'
    }
    const liveStreams = streams.filter((stream) => stream.endedAt === undefined)
    if (liveStreams.length === 0) {
        return 'dropped'
    }
    // Server đã XÁC NHẬN transport rớt và peer đang trong cửa sổ reconnect. Biết chắc thì không cần
    // đợi đủ ngưỡng im lặng bên dưới - đó chỉ là cách suy đoán cho trường hợp không có tin tức gì.
    if (liveStreams.some((stream) => stream.disconnectedAt !== undefined)) {
        return 'lost'
    }
    // Lấy luồng im lặng LÂU NHẤT, không phải "có luồng nào im không": một luồng đứng hình là đủ để
    // cả học viên đáng nhìn lại (hỏng camera trong khi màn hình vẫn chạy vẫn là mất một nửa bằng
    // chứng), và chính con số lâu nhất đó mới quyết định được đã tới nấc nghi mất kết nối chưa.
    const silentForMs = liveStreams.reduce((longest, stream) => {
        if (stream.lastFrameAt === undefined) {
            return longest
        }
        return Math.max(longest, now - stream.lastFrameAt)
    }, 0)
    if (silentForMs > STALE_LOST_MS) {
        return 'lost'
    }
    return silentForMs > STALE_MS ? 'stale' : 'live'
}

type UseMonitoringBoardParams = {
    alerts: AlertView[]
    candidates: ProctorCandidateSummaryDto[]
    filter: StreamFilter
    now: number
    streams: StreamView[]
}

/**
 * Ghép danh sách thí sinh (Java) với các luồng đang sống (vox-streaming) thành một bảng lấy **học
 * viên** làm đơn vị.
 *
 * <p>Đơn vị của giám sát thi là con người, không phải loại luồng: dấu hiệu gian lận hầu như luôn
 * nằm ở tổ hợp - mặt nhìn lệch đi *cùng lúc* màn hình đang mở thứ khác. Vì thế camera/màn hình chỉ
 * là bộ lọc mật độ, còn một học viên luôn là một ô.
 *
 * <p>Khoá ghép là `participantId` của stream = `candidateId` của thí sinh.
 */
export function useMonitoringBoard({ alerts, candidates, filter, now, streams }: UseMonitoringBoardParams) {
    const candidateById = useMemo(
        () => new Map(candidates.map((candidate) => [candidate.candidateId, candidate])),
        [candidates],
    )

    const candidateIdBySessionId = useMemo(() => {
        const map = new Map<string, string>()
        for (const candidate of candidates) {
            if (candidate.sessionId) {
                map.set(candidate.sessionId, candidate.candidateId)
            }
        }
        // Luồng đang sống biết cặp (phiên thi, thí sinh) sớm hơn roster, vốn chỉ tải lại theo nhịp.
        for (const stream of streams) {
            if (stream.sessionId && stream.participantId) {
                map.set(stream.sessionId, stream.participantId)
            }
        }
        return map
    }, [candidates, streams])

    /**
     * Chủ nhân thật của một cảnh báo.
     *
     * <p>`alert.participantId` lẽ ra là candidateId, nhưng AI service đang gán CẢ BA định danh
     * (sessionId, participantId, streamId) bằng cùng một giá trị, nên với cảnh báo do AI sinh thì
     * trường này thực chất là id PHIÊN THI. Hệ quả không chỉ là dòng cảnh báo in ra một chuỗi UUID
     * thay vì tên: khoá sai còn khiến cảnh báo không bao giờ dính vào ô nào, nên trạng thái "Có
     * cảnh báo", viền đỏ và cả thứ tự ưu tiên của lưới đều chết theo.
     *
     * <p>Ngả về sessionId vá được ngay hôm nay mà không phải chờ sửa phía AI; khi AI gửi đúng
     * participantId thì nhánh đầu vẫn thắng, nên không có gì phải gỡ lại sau này.
     */
    const resolveAlertCandidateId = useCallback(
        (alert: AlertView) => {
            if (candidateById.has(alert.participantId)) {
                return alert.participantId
            }
            return candidateIdBySessionId.get(alert.sessionId) ?? alert.participantId
        },
        [candidateById, candidateIdBySessionId],
    )

    const alertByCandidate = useMemo(() => {
        // alerts đã được xếp mới nhất trước, nên lần set đầu tiên cho mỗi người là cái mới nhất.
        const map = new Map<string, AlertView>()
        for (const alert of alerts) {
            const candidateId = resolveAlertCandidateId(alert)
            if (!map.has(candidateId)) {
                map.set(candidateId, alert)
            }
        }
        return map
    }, [alerts, resolveAlertCandidateId])

    const streamsByCandidate = useMemo(() => {
        const map = new Map<string, StreamView[]>()
        for (const stream of streams) {
            const list = map.get(stream.participantId) ?? []
            list.push(stream)
            map.set(stream.participantId, list)
        }
        return map
    }, [streams])

    /** Học viên có luồng (đang sống hoặc vừa ngừng) - đây là những ô hiện trên lưới. */
    const onScreen = useMemo(() => {
        const entries: ParticipantBoardEntry[] = []
        for (const [candidateId, candidateStreams] of streamsByCandidate) {
            const candidate = candidateById.get(candidateId)
            const latestAlert = alertByCandidate.get(candidateId)
            entries.push({
                allStreams: candidateStreams,
                blockedAt: candidate?.blockedAt,
                candidateId,
                candidateStatus: candidate?.status,
                latestAlert,
                sessionFlagged: candidate?.sessionFlagged ?? false,
                // Ưu tiên sessionId từ luồng: roster có thể chưa kịp thấy phiên thi vừa mở.
                sessionId: candidateStreams.find((stream) => stream.sessionId)?.sessionId ?? candidate?.sessionId,
                sessionStatus: candidate?.sessionStatus,
                status: resolveStatus(candidateStreams, latestAlert, candidate?.sessionStatus, now),
                streams:
                    filter === 'all'
                        ? candidateStreams
                        : candidateStreams.filter((stream) => stream.streamType === filter),
                studentEmail: candidate?.studentEmail,
                // Chưa join được roster thì hiện id thô còn hơn hiện ô trống - vẫn tra cứu được.
                studentName: candidate?.studentName?.trim() || candidate?.studentEmail?.trim() || candidateId,
            })
        }

        const weight = (entry: ParticipantBoardEntry) => PARTICIPANT_STATUS_ORDER.indexOf(entry.status)
        return entries.sort((left, right) => {
            const byStatus = weight(left) - weight(right)
            if (byStatus !== 0) {
                return byStatus
            }
            return left.studentName.localeCompare(right.studentName, 'vi')
        })
    }, [alertByCandidate, candidateById, filter, now, streamsByCandidate])

    /**
     * Thí sinh được xếp ca nhưng chưa từng có luồng nào. Họ không có ô trên lưới - và đó chính là
     * lý do phải liệt kê riêng: hiện nay một học viên không bao giờ kết nối là hoàn toàn vô hình,
     * không có ô nào để mà đứng hình.
     */
    const neverConnected = useMemo(
        () => candidates.filter((candidate) => !streamsByCandidate.has(candidate.candidateId)),
        [candidates, streamsByCandidate],
    )

    return { neverConnected, onScreen, resolveAlertCandidateId }
}
