import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { toApiError } from '@/shared/api'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { useForceEndExamSessionMutation } from '@/features/examCore/api/mutations'
import { useMyProctorScheduleCandidatesQuery } from '@/features/examCore/api/queries'
import type { ProctorCandidateSummaryDto } from '@/features/examCore/types'

import { useScheduleProctoringAlertsQuery } from '@/features/proctoring-alerts'

import { useScheduleMonitor, type AlertView, type StreamView } from '../api/useRoomMonitor'
import { LiveRewindPanel, type LatestAlertNotice, type SeekRequest } from '../components/LiveRewindPanel'
import { ParticipantCard } from '../components/ParticipantCard'
import { RoomAlertFeed } from '../components/RoomAlertFeed'
import { RoomRosterPanel } from '../components/RoomRosterPanel'
import {
    alertDedupeKey,
    useMonitoringBoard,
    type ParticipantBoardEntry,
    type StreamFilter,
} from '../hooks/useMonitoringBoard'
import { getAlertTypeDisplay, type MonitorConnectionState, type StreamType } from '../types'

const EMPTY_CANDIDATES: ProctorCandidateSummaryDto[] = []

/**
 * Nhịp tải lại roster. Đây là nguồn DUY NHẤT cho biết phiên thi đã đóng hay chưa - lưới video chỉ
 * thấy được luồng ngừng phát, mà "nộp bài xong" với "rớt mạng" thì trông giống hệt nhau từ đó.
 */
const ROSTER_POLL_MS = 15_000

/**
 * Số cảnh báo giữ lại sau khi gộp lịch sử với luồng trực tiếp.
 *
 * <p>Cùng mục đích với MAX_ALERTS của luồng trực tiếp: một ca thi dài không được biến dòng cảnh báo
 * thành chỗ rò rỉ bộ nhớ. Lịch sử đầy đủ nằm ở server và tra được ở màn chấm bài.
 */
const MAX_MERGED_ALERTS = 200

const CONNECTION_LABEL: Record<MonitorConnectionState, string> = {
    closed: 'Đã đóng',
    connected: 'Đang kết nối trực tiếp',
    connecting: 'Đang kết nối...',
    error: 'Lỗi kết nối',
    idle: 'Chưa kết nối',
    reconnecting: 'Đang kết nối lại...',
}

/**
 * Màu của phù hiệu trạng thái kết nối.
 *
 * <p>Trước đây mọi trạng thái dùng chung một viên xám: chữ có khác nhau, nhưng thứ duy nhất bắt mắt
 * người đang quét qua một lưới đầy ô video thì không. Giám thị nhìn phù hiệu này đúng vào lúc bận
 * nhất, nên khác biệt phải thấy được mà không cần đọc.
 *
 * <p>`error` là trạng thái mới CÓ THỂ tới được -- xem ATTEMPTS_BEFORE_ERROR trong useRoomMonitor.
 * Nó không có nghĩa là đã bỏ cuộc (vẫn đang thử lại), mà là "đã trượt đủ lâu để đừng tin cái lưới
 * này nữa".
 */
const CONNECTION_TONE: Record<MonitorConnectionState, string> = {
    closed: 'border-slate-200 bg-white text-slate-600',
    connected: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    connecting: 'border-amber-200 bg-amber-50 text-amber-700',
    error: 'border-red-200 bg-red-50 text-red-700',
    idle: 'border-slate-200 bg-white text-slate-600',
    reconnecting: 'border-amber-200 bg-amber-50 text-amber-700',
}

const FILTER_OPTIONS: { label: string; value: StreamFilter }[] = [
    { label: 'Cả hai', value: 'all' },
    { label: 'Camera', value: 'camera' },
    { label: 'Màn hình', value: 'screen' },
]

/**
 * Luồng đang được xem trong panel.
 *
 * <p>Mang cả `streamId` lẫn `streamType` vì hai trường trả lời hai câu khác nhau, và trước đây chỉ
 * có cái sau: thanh tab vẽ theo từng luồng nhưng báo ra ngoài mỗi loại, nên khi một học viên vào lại
 * và có hai luồng camera, bấm tab camera thứ hai luôn giải ngược về camera thứ nhất - tab đó vĩnh
 * viễn không tới được.
 */
type WatchTarget = {
    candidateId: string
    /**
     * Ghim vào ĐÚNG `streamId` này thay vì bám luồng hiện hành của loại.
     *
     * <p>Chỉ bật khi giám thị chủ động chọn một luồng đã kết thúc (bấm cảnh báo cũ, hoặc bấm tab bản
     * ghi) - lúc đó họ đang xem quá khứ có chủ đích và không được kéo về hiện tại. Khi đang xem một
     * luồng còn sống thì tắt, để học viên rớt rồi vào lại là panel tự bám sang luồng mới thay vì
     * đứng lại trên một bản ghi đã đóng trong khi người đó đã lên sóng trở lại.
     */
    pinned: boolean
    streamId: string
    streamType: StreamType
}

/**
 * Luồng này có chứa mốc thời gian đó không.
 *
 * <p>Cần khi một học viên vào lại nhiều lần: cùng một loại luồng khi ấy có nhiều đoạn ghi nối nhau,
 * và một cảnh báo cũ không mang `streamId` sẽ mở đoạn mới nhất - đoạn không chứa thời điểm cần xem,
 * nên tua tới chỉ nhận lại "đã trôi khỏi cửa sổ tua lại".
 *
 * <p>Mốc bắt đầu không đọc được thì trả false chứ không coi là chứa: `Date.parse('')` ra NaN, và
 * một cửa sổ bắt đầu từ NaN sẽ nhận vơ mọi thời điểm.
 */
function coversMoment(stream: StreamView, atMs: number): boolean {
    const startedAt = Date.parse(stream.startedAt)
    if (!Number.isFinite(startedAt) || atMs < startedAt) {
        return false
    }
    return stream.endedAt === undefined || atMs <= stream.endedAt
}

export function MonitoringRoomPage() {
    const { examId, scheduleId } = useParams()
    const { alerts, connectionState, refreshStreamToken, streamToken, streams } = useScheduleMonitor({
        examId,
        scheduleId,
    })
    const candidatesQuery = useMyProctorScheduleCandidatesQuery(scheduleId ?? null, {
        refetchInterval: ROSTER_POLL_MS,
    })
    const candidates = candidatesQuery.data ?? EMPTY_CANDIDATES

    const forceEndExamSessionMutation = useForceEndExamSessionMutation()
    const { confirmWithReason, dialog } = useConfirmationDialog()
    const [message, setMessage] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Bộ lọc mật độ, KHÔNG phải tab điều hướng: mọi lựa chọn đều đang nhìn cùng một tập học viên,
    // chỉ khác số luồng hiện trên mỗi ô. Tách camera và màn hình thành hai tab sẽ chia đôi đúng thứ
    // không được phép chia - câu trả lời cho "tôi đang theo dõi những ai".
    const [filter, setFilter] = useState<StreamFilter>('all')

    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])

    // Lịch sử cảnh báo đã lưu. Kênh trực tiếp là pub/sub fire-and-forget nên nó chỉ kể được những gì
    // xảy ra SAU khi giám thị kết nối: vào ca muộn, tải lại trang, hay mở thêm một người giám sát
    // thứ hai đều từng dẫn tới việc mỗi người thấy một lịch sử khác nhau.
    const alertHistoryQuery = useScheduleProctoringAlertsQuery(scheduleId ?? null)
    const alertHistory = alertHistoryQuery.data

    const mergedAlerts = useMemo(() => {
        const seen = new Set(alerts.map(alertDedupeKey))
        const merged: AlertView[] = [...alerts]

        for (const row of alertHistory ?? []) {
            const view: AlertView = {
                alertType: row.alertType,
                capturedAt: row.capturedAt,
                confidence: row.confidence ?? 0,
                eventId: row.eventId,
                participantId: row.candidateId ?? '',
                // receivedAt = thời điểm SỰ VIỆC, không phải lúc tải về. Trường này quyết định một
                // cảnh báo còn "nóng" hay không (ALERT_ATTENTION_MS); lấy thời điểm tải sẽ khiến
                // toàn bộ lịch sử của cả ca thi bùng lên đỏ rực mỗi lần refetch.
                receivedAt: Date.parse(row.capturedAt) || 0,
                sessionId: row.examSessionId,
                streamId: row.streamId ?? '',
                // Mang theo để bấm vào một cảnh báo mở đúng LOẠI luồng đã sinh ra nó: cảnh báo camera
                // dẫn tới camera, cảnh báo màn hình dẫn tới màn hình. Thiếu nó thì mọi cảnh báo đều
                // rơi về luồng đầu tiên của học viên, và một nửa số lần bấm mở nhầm khung hình.
                streamType: row.streamType as StreamType | undefined,
            }
            const key = alertDedupeKey(view)
            if (seen.has(key)) {
                continue
            }
            seen.add(key)
            merged.push(view)
        }

        return merged.sort((left, right) => right.receivedAt - left.receivedAt).slice(0, MAX_MERGED_ALERTS)
    }, [alertHistory, alerts])

    const { neverConnected, onScreen, resolveAlertCandidateId } = useMonitoringBoard({
        alerts: mergedAlerts,
        candidates,
        filter,
        now,
        streams,
    })

    const [watching, setWatching] = useState<null | WatchTarget>(null)
    const [seekRequest, setSeekRequest] = useState<null | SeekRequest>(null)

    /**
     * Chọn một luồng cụ thể để xem - dùng chung cho ô thumbnail và thanh tab của panel.
     *
     * <p>Cờ ghim suy ra từ chính luồng được chọn: chọn một luồng đã kết thúc là chọn xem lại, còn
     * chọn một luồng đang sống là chọn theo dõi hiện tại. Không có tham số nào cho người gọi truyền
     * sai.
     */
    const handleWatchStream = useCallback((entry: ParticipantBoardEntry, streamId: string) => {
        const picked = entry.allStreams.find((item) => item.streamId === streamId)
        if (!picked) {
            return
        }
        setWatching({
            candidateId: entry.candidateId,
            pinned: picked.endedAt !== undefined,
            streamId,
            streamType: picked.streamType,
        })
    }, [])

    /**
     * Bấm một cảnh báo: mở luồng của học viên đó rồi tua tới đúng thời điểm.
     *
     * <p>`requestId` tăng dần chứ không dùng chính mốc thời gian làm khoá: bấm lại cùng một cảnh báo
     * sau khi đã tua đi chỗ khác phải quay về được, mà nếu khoá theo mốc thì lần bấm thứ hai trông
     * y hệt lần đầu và effect bên panel bỏ qua.
     */
    const handleSelectAlert = useCallback(
        (alert: AlertView) => {
            const candidateId = resolveAlertCandidateId(alert)
            const entry = onScreen.find((item) => item.candidateId === candidateId)
            if (!entry || entry.allStreams.length === 0) {
                setErrorMessage('Học viên của cảnh báo này hiện không có luồng nào đang xem được.')
                return
            }

            const atMs = Date.parse(alert.capturedAt) || alert.receivedAt
            if (!atMs) {
                setErrorMessage('Cảnh báo này không có mốc thời gian để tua tới.')
                return
            }

            // Ưu tiên đúng luồng đã SINH RA cảnh báo -- đó mới là chỗ có thứ để xem. Tra trong
            // `allStreams` chứ không `currentStreams`: cảnh báo cũ thuộc về một luồng đã bị lần kết
            // nối sau thay thế, và đó chính là luồng phải mở ra.
            const byAlertStream = alert.streamId
                ? entry.allStreams.find((item) => item.streamId === alert.streamId)
                : undefined
            // Không có streamId thì lần theo loại - nhưng phải chọn đoạn CHỨA được mốc đó, vì một
            // học viên vào lại nhiều lần có nhiều đoạn ghi cùng loại nối tiếp nhau.
            const byAlertType = alert.streamType
                ? (entry.allStreams.find(
                      (item) => item.streamType === alert.streamType && coversMoment(item, atMs),
                  ) ?? entry.currentStreams.find((item) => item.streamType === alert.streamType))
                : undefined
            const keepType = watching?.candidateId === candidateId ? watching.streamType : undefined
            const target =
                byAlertStream ??
                byAlertType ??
                (keepType && entry.currentStreams.find((item) => item.streamType === keepType)) ??
                entry.currentStreams[0]
            setWatching({
                candidateId,
                pinned: target.endedAt !== undefined,
                streamId: target.streamId,
                streamType: target.streamType,
            })
            setSeekRequest((previous) => ({ atMs, requestId: (previous?.requestId ?? 0) + 1 }))
        },
        [onScreen, resolveAlertCandidateId, watching],
    )

    const watchingEntry = useMemo(
        () => onScreen.find((entry) => entry.candidateId === watching?.candidateId),
        [onScreen, watching],
    )
    const watchingStream = useMemo(() => {
        if (!watchingEntry || !watching) {
            return undefined
        }
        // Đang xem lại có chủ đích thì giữ nguyên đúng luồng đó, kể cả khi học viên đã lên sóng lại
        // bằng một luồng mới: bị kéo về hiện tại giữa lúc đang xem bằng chứng là mất chỗ đang xem.
        if (watching.pinned) {
            const pinned = watchingEntry.allStreams.find((stream) => stream.streamId === watching.streamId)
            if (pinned) {
                return pinned
            }
        }
        // Ngược lại thì bám luồng HIỆN HÀNH của loại đang xem, nên một lần rớt rồi vào lại chỉ đổi
        // nguồn phát chứ không đá giám thị ra ngoài. Rơi về luồng còn lại nếu loại đó biến mất --
        // xem tiếp camera vẫn hơn là màn hình đen.
        return (
            watchingEntry.currentStreams.find((stream) => stream.streamType === watching.streamType) ??
            watchingEntry.allStreams.find((stream) => stream.streamId === watching.streamId) ??
            watchingEntry.currentStreams[0]
        )
    }, [watchingEntry, watching])

    /**
     * Các tab của panel: luồng hiện hành của mỗi loại, cộng những bản ghi cần giữ đường quay lại.
     *
     * <p>Nhờ vậy thanh tab bình thường chỉ có Camera và Màn hình, còn khi giám thị bấm vào một cảnh
     * báo cũ thì đoạn ghi ấy hiện thêm một tab để họ thấy mình đang ở đâu và quay về hiện tại được.
     */
    const panelStreams = useMemo(() => {
        if (!watchingEntry || !watchingStream) {
            return []
        }
        const current = watchingEntry.currentStreams
        const extras: StreamView[] = []
        const keep = (stream?: StreamView) => {
            if (stream && !current.includes(stream) && !extras.includes(stream)) {
                extras.push(stream)
            }
        }
        keep(watchingStream)
        // Cả đoạn giám thị đã CHỌN trước đó, kể cả khi panel đã tự bám sang luồng mới: học viên rớt
        // rồi vào lại đúng lúc đang tua lại bằng chứng là chuyện có thật, và nếu không giữ tab này
        // thì đoạn đang xem dở biến mất khỏi màn hình mà không còn đường nào quay về nó.
        keep(watchingEntry.allStreams.find((stream) => stream.streamId === watching?.streamId))
        return extras.length === 0 ? current : [...current, ...extras]
    }, [watching, watchingEntry, watchingStream])

    const nameByCandidateId = useMemo(() => {
        const map = new Map<string, string>()
        for (const candidate of candidates) {
            map.set(
                candidate.candidateId,
                candidate.studentName?.trim() || candidate.studentEmail?.trim() || candidate.candidateId,
            )
        }
        return map
    }, [candidates])

    /**
     * Cảnh báo mới nhất của phòng, thu về primitive cho panel.
     *
     * <p>`mergedAlerts` đã sắp giảm dần theo `receivedAt`, nên phần tử đầu là mới nhất. Dùng
     * `receivedAt` chứ không `capturedAt`: nó đã được chuẩn hoá về số ở bước gộp, và với cảnh báo
     * đọc từ lịch sử thì chính nó mang mốc SỰ VIỆC.
     */
    const latestAlertNotice = useMemo<LatestAlertNotice | null>(() => {
        const newest = mergedAlerts[0]
        if (!newest) {
            return null
        }
        return {
            atMs: newest.receivedAt,
            label: getAlertTypeDisplay(newest.alertType).label,
            participantName:
                nameByCandidateId.get(resolveAlertCandidateId(newest)) ?? (newest.participantId || 'Không rõ'),
        }
    }, [mergedAlerts, nameByCandidateId, resolveAlertCandidateId])

    // useCallback vì panel đăng ký nó vào listener keydown (Esc): một identity mới mỗi lần render sẽ
    // tháo và gắn lại listener liên tục.
    const handleCloseWatch = useCallback(() => {
        setWatching(null)
        setSeekRequest(null)
    }, [])

    async function handleForceEnd(entry: ParticipantBoardEntry) {
        if (!entry.sessionId) {
            return
        }
        const candidateName = nameByCandidateId.get(entry.candidateId) ?? entry.studentName

        const result = await confirmWithReason({
            message: `Tạm dừng bài thi của ${candidateName} để xem xét? Học sinh sẽ bị ngắt kết nối ngay và không vào lại được cho tới khi được dỡ cấm.`,
            reasonLabel: 'Lý do buộc kết thúc',
            reasonPlaceholder: 'Nhập lý do buộc kết thúc bài thi...',
            requireReason: true,
            title: 'Xác nhận buộc kết thúc',
        })
        if (!result.confirmed) {
            return
        }

        try {
            await forceEndExamSessionMutation.mutateAsync({ reason: result.reason, sessionId: entry.sessionId })
            await candidatesQuery.refetch()
            setMessage(`Đã buộc kết thúc bài thi của ${candidateName}.`)
        } catch (error) {
            setErrorMessage(toApiError(error).message)
        }
    }

    return (
        <section aria-labelledby="monitoring-room-title" className="grid gap-6">
            <div className="flex flex-col gap-3">
                {/*
                  Cùng lý do với MonitoringExamSchedulesPage: `to=".."` giải theo ROUTE nên
                  văng ra trang chủ. Theo PATH, bỏ 2 đoạn từ
                  `/teacher/monitoring/exams/:examId/schedules/:scheduleId` ra đúng
                  `/teacher/monitoring/exams/:examId` -- danh sách ca thi của kỳ thi này.
                */}
                <Link
                    className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-800"
                    relative="path"
                    to="../.."
                >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Quay lại danh sách ca thi
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-black uppercase text-cyan-700">Đang giám sát</p>
                        <h1
                            className="mt-2 text-3xl font-black tracking-0 text-slate-950"
                            id="monitoring-room-title"
                        >
                            Phòng thi
                        </h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                            {FILTER_OPTIONS.map((option) => (
                                <button
                                    className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                                        filter === option.value
                                            ? 'bg-cyan-600 text-white'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                    key={option.value}
                                    onClick={() => setFilter(option.value)}
                                    type="button"
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${CONNECTION_TONE[connectionState]}`}>
                            {CONNECTION_LABEL[connectionState]}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="grid content-start gap-5">
                    {/*
                      Panel xem nằm ở CỘT CHÍNH, không phải sidebar 320px. Ở sidebar, video rộng
                      ~288px sau padding -- tức bằng hoặc NHỎ HƠN chính những ô thumbnail vừa được
                      bấm vào (cột chính chia 2 thẻ × 2 luồng = 4 ô ngang). Bấm để "xem kỹ" mà nhận
                      khung nhỏ hơn là tai nạn của việc đặt panel vào sidebar.

                      Đổi chỗ cũng gỡ luôn việc panel và dòng cảnh báo tranh nhau một cột: mở xem
                      thì cảnh báo bị đẩy xuống, đúng lúc cần cả hai nhất.
                    */}
                    {watchingEntry && watchingStream ? (
                        <LiveRewindPanel
                            availableStreams={panelStreams}
                            latestAlert={latestAlertNotice}
                            onAuthError={() => void refreshStreamToken()}
                            onClose={handleCloseWatch}
                            onSeekUnavailable={() =>
                                setErrorMessage(
                                    'Thời điểm của cảnh báo này đã trôi khỏi cửa sổ tua lại. Bản ghi đầy đủ xem được ở màn chấm bài.',
                                )
                            }
                            onSelectStream={(streamId) => handleWatchStream(watchingEntry, streamId)}
                            participantName={watchingEntry.studentName}
                            scheduleId={scheduleId}
                            seekRequest={seekRequest}
                            stream={watchingStream}
                            token={streamToken}
                        />
                    ) : null}

                    {onScreen.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-medium text-slate-500">
                            Chưa có học sinh nào đang stream trong phòng.
                        </p>
                    ) : (
                        // Đang xem một người thì lưới dày lên chứ KHÔNG bớt người: lúc đó việc của
                        // lưới là TRẠNG THÁI, không phải video. Giám thị không cần đọc nội dung màn
                        // hình của 19 người kia, họ cần liếc thấy ai vừa chuyển đỏ -- đúng thứ
                        // STATUS_RING được thiết kế cho thị giác ngoại vi. Thu nhỏ thì được, ẩn
                        // bớt người thì không.
                        <div
                            className={`grid gap-5 ${
                                watchingEntry ? 'md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'lg:grid-cols-2'
                            }`}
                        >
                            {onScreen.map((entry) => (
                                <ParticipantCard
                                    entry={entry}
                                    key={entry.candidateId}
                                    now={now}
                                    onForceEnd={handleForceEnd}
                                    onWatch={(streamId) => handleWatchStream(entry, streamId)}
                                    watchingStreamId={watchingStream?.streamId}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid content-start gap-4">
                    <RoomRosterPanel neverConnected={neverConnected} onScreen={onScreen} />
                    <RoomAlertFeed
                        alerts={mergedAlerts}
                        onSelect={handleSelectAlert}
                        resolveName={(alert) =>
                            nameByCandidateId.get(resolveAlertCandidateId(alert)) ?? alert.participantId
                        }
                    />
                </div>
            </div>

            {dialog}
            <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
            <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
        </section>
    )
}
