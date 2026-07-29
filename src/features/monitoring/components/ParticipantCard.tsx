import { Flag } from 'lucide-react'

import { StatusBadge, type StatusTone } from '@/shared/ui/StatusBadge'

import type { ParticipantBoardEntry, ParticipantStatus } from '../hooks/useMonitoringBoard'
import { getAlertTypeDisplay, getStreamTypeLabel } from '../types'
import { StreamThumbnail } from './StreamThumbnail'

const STATUS_DISPLAY: Record<ParticipantStatus, { label: string; tone: StatusTone }> = {
    alerted: { label: 'Có cảnh báo', tone: 'danger' },
    dropped: { label: 'Mất kết nối', tone: 'danger' },
    live: { label: 'Đang lên sóng', tone: 'success' },
    stale: { label: 'Đứng hình', tone: 'warning' },
}

/**
 * Viền ngoài đổi màu theo mức đáng chú ý. Đây là tín hiệu đọc được bằng thị giác ngoại vi - giám
 * thị thấy có chuyện mà không cần đọc chữ trên từng ô.
 */
const STATUS_RING: Record<ParticipantStatus, string> = {
    alerted: 'border-red-300 ring-2 ring-red-200',
    dropped: 'border-red-200',
    live: 'border-slate-200',
    stale: 'border-amber-200',
}

type ParticipantCardProps = {
    entry: ParticipantBoardEntry
    now: number
    onWatch: (streamId: string) => void
    watchingStreamId?: string
}

export function ParticipantCard({ entry, now, onWatch, watchingStreamId }: ParticipantCardProps) {
    const status = STATUS_DISPLAY[entry.status]
    const alertDisplay = entry.latestAlert ? getAlertTypeDisplay(entry.latestAlert.alertType) : null

    // Học viên không có loại luồng đang lọc: vẫn giữ ô lại thay vì ẩn đi, vì "không có màn hình"
    // chính là thông tin mà bộ lọc màn hình cần cho thấy.
    const missingForFilter = entry.streams.length === 0

    return (
        <div className={`rounded-xl border bg-white p-4 ${STATUS_RING[entry.status]}`}>
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{entry.studentName}</p>
                    <p className="truncate text-xs font-medium text-slate-500">
                        {entry.allStreams.map((stream) => getStreamTypeLabel(stream.streamType)).join(' · ') || '—'}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    {entry.sessionFlagged ? (
                        <span
                            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
                            title="Phiên thi đã bị đánh dấu nghi vấn"
                        >
                            <Flag aria-hidden="true" className="size-3" />
                            Đã đánh dấu
                        </span>
                    ) : null}
                    <StatusBadge label={status.label} tone={status.tone} />
                </div>
            </div>

            {alertDisplay && entry.latestAlert ? (
                <p className={`mb-3 rounded-lg border px-3 py-1.5 text-xs font-semibold ${alertDisplay.className}`}>
                    {alertDisplay.label}
                </p>
            ) : null}

            {missingForFilter ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-xs font-medium text-slate-500">
                    Học viên này không có luồng thuộc loại đang lọc.
                </p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {entry.streams.map((stream) => (
                        <StreamThumbnail
                            isWatching={stream.streamId === watchingStreamId}
                            key={stream.streamId}
                            now={now}
                            onSelect={() => onWatch(stream.streamId)}
                            stream={stream}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
