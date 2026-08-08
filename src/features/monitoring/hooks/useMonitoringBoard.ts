import { useMemo } from 'react'

import type { ProctorCandidateSummaryDto } from '@/features/examCore/types'

import type { AlertView, StreamView } from '../api/useRoomMonitor'
import type { StreamType } from '../types'

/** Quá thời gian này mà không có frame mới thì coi như đứng hình (server sinh frame mỗi 5 giây). */
export const STALE_MS = 12_000

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
export const PARTICIPANT_STATUS_ORDER = ['alerted', 'dropped', 'stale', 'live'] as const

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

function resolveStatus(streams: StreamView[], latestAlert: AlertView | undefined, now: number): ParticipantStatus {
    if (latestAlert && now - latestAlert.receivedAt <= ALERT_ATTENTION_MS) {
        return 'alerted'
    }
    const liveStreams = streams.filter((stream) => stream.endedAt === undefined)
    if (liveStreams.length === 0) {
        return 'dropped'
    }
    // Một luồng đứng hình là đủ để cả học viên đáng nhìn lại: hỏng camera trong khi màn hình vẫn
    // chạy vẫn là mất một nửa bằng chứng.
    const hasStale = liveStreams.some(
        (stream) => stream.lastFrameAt !== undefined && now - stream.lastFrameAt > STALE_MS,
    )
    return hasStale ? 'stale' : 'live'
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
    const alertByCandidate = useMemo(() => {
        // alerts đã được xếp mới nhất trước, nên lần set đầu tiên cho mỗi người là cái mới nhất.
        const map = new Map<string, AlertView>()
        for (const alert of alerts) {
            if (!map.has(alert.participantId)) {
                map.set(alert.participantId, alert)
            }
        }
        return map
    }, [alerts])

    const streamsByCandidate = useMemo(() => {
        const map = new Map<string, StreamView[]>()
        for (const stream of streams) {
            const list = map.get(stream.participantId) ?? []
            list.push(stream)
            map.set(stream.participantId, list)
        }
        return map
    }, [streams])

    const candidateById = useMemo(
        () => new Map(candidates.map((candidate) => [candidate.candidateId, candidate])),
        [candidates],
    )

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
                status: resolveStatus(candidateStreams, latestAlert, now),
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

    return { neverConnected, onScreen }
}
