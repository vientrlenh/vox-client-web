import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { useMyProctorScheduleCandidatesQuery } from '@/features/examCore/api/queries'
import type { ProctorCandidateSummaryDto } from '@/features/examCore/types'

import { useScheduleMonitor } from '../api/useRoomMonitor'
import { LiveRewindPanel } from '../components/LiveRewindPanel'
import { ParticipantCard } from '../components/ParticipantCard'
import { RoomAlertFeed } from '../components/RoomAlertFeed'
import { RoomRosterPanel } from '../components/RoomRosterPanel'
import { useMonitoringBoard, type StreamFilter } from '../hooks/useMonitoringBoard'
import { type MonitorConnectionState, type StreamType } from '../types'

const EMPTY_CANDIDATES: ProctorCandidateSummaryDto[] = []

const CONNECTION_LABEL: Record<MonitorConnectionState, string> = {
    closed: 'Đã đóng',
    connected: 'Đang kết nối trực tiếp',
    connecting: 'Đang kết nối...',
    error: 'Lỗi kết nối',
    idle: 'Chưa kết nối',
    reconnecting: 'Đang kết nối lại...',
}

const FILTER_OPTIONS: { label: string; value: StreamFilter }[] = [
    { label: 'Cả hai', value: 'all' },
    { label: 'Camera', value: 'camera' },
    { label: 'Màn hình', value: 'screen' },
]

export function MonitoringRoomPage() {
    const { examId, scheduleId } = useParams()
    const { alerts, connectionState, streamToken, streams } = useScheduleMonitor({ examId, scheduleId })
    const candidatesQuery = useMyProctorScheduleCandidatesQuery(scheduleId ?? null)
    const candidates = candidatesQuery.data ?? EMPTY_CANDIDATES

    // Bộ lọc mật độ, KHÔNG phải tab điều hướng: mọi lựa chọn đều đang nhìn cùng một tập học viên,
    // chỉ khác số luồng hiện trên mỗi ô. Tách camera và màn hình thành hai tab sẽ chia đôi đúng thứ
    // không được phép chia - câu trả lời cho "tôi đang theo dõi những ai".
    const [filter, setFilter] = useState<StreamFilter>('all')

    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])

    const { neverConnected, onScreen } = useMonitoringBoard({
        alerts,
        candidates,
        filter,
        now,
        streams,
    })

    // Lưu theo cặp (học viên, loại luồng) chứ không theo streamId: một lần reconnect sinh streamId
    // mới, và giám thị đang xem sẽ bị đá ra ngoài dù học viên vẫn là người đó và vẫn đang stream.
    const [watching, setWatching] = useState<null | { candidateId: string; streamType: StreamType }>(null)

    const watchingEntry = useMemo(
        () => onScreen.find((entry) => entry.candidateId === watching?.candidateId),
        [onScreen, watching],
    )
    const watchingStream = useMemo(() => {
        if (!watchingEntry) {
            return undefined
        }
        // Rơi về luồng còn lại nếu loại đang xem biến mất - xem tiếp camera vẫn hơn là màn hình đen.
        return (
            watchingEntry.allStreams.find((stream) => stream.streamType === watching?.streamType) ??
            watchingEntry.allStreams[0]
        )
    }, [watchingEntry, watching])

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

    return (
        <section aria-labelledby="monitoring-room-title" className="grid gap-6">
            <div className="flex flex-col gap-3">
                <Link
                    className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-800"
                    to=".."
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
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
                            {CONNECTION_LABEL[connectionState]}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="grid content-start gap-5">
                    {onScreen.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-medium text-slate-500">
                            Chưa có học sinh nào đang stream trong phòng.
                        </p>
                    ) : (
                        <div className="grid gap-5 lg:grid-cols-2">
                            {onScreen.map((entry) => (
                                <ParticipantCard
                                    entry={entry}
                                    key={entry.candidateId}
                                    now={now}
                                    onWatch={(streamId) => {
                                        const picked = entry.allStreams.find((item) => item.streamId === streamId)
                                        if (picked) {
                                            setWatching({
                                                candidateId: entry.candidateId,
                                                streamType: picked.streamType,
                                            })
                                        }
                                    }}
                                    watchingStreamId={watchingStream?.streamId}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid content-start gap-4">
                    {/* Panel nằm cạnh lưới chứ không thay thế lưới: soi kỹ một học viên mà mù với
                        những người còn lại thì mất đúng lý do tồn tại của màn hình giám sát. */}
                    {watchingEntry && watchingStream ? (
                        <LiveRewindPanel
                            availableStreams={watchingEntry.allStreams}
                            onClose={() => setWatching(null)}
                            onSelectStreamType={(streamType) =>
                                setWatching({ candidateId: watchingEntry.candidateId, streamType })
                            }
                            participantName={watchingEntry.studentName}
                            scheduleId={scheduleId}
                            stream={watchingStream}
                            token={streamToken}
                        />
                    ) : null}
                    <RoomRosterPanel neverConnected={neverConnected} onScreen={onScreen} />
                    <RoomAlertFeed
                        alerts={alerts}
                        resolveName={(participantId) => nameByCandidateId.get(participantId) ?? participantId}
                    />
                </div>
            </div>
        </section>
    )
}
