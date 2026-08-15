import type { StreamView } from '../api/useRoomMonitor'
import { STALE_LOST_MS, STALE_MS } from '../hooks/useMonitoringBoard'
import { getStreamTypeLabel } from '../types'

type StreamThumbnailProps = {
    isWatching?: boolean
    now: number
    onSelect?: () => void
    stream: StreamView
}

function formatClock(at: number): string {
    return new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function StreamThumbnail({ isWatching, now, onSelect, stream }: StreamThumbnailProps) {
    const hasEnded = stream.endedAt !== undefined
    const silentForMs = !hasEnded && stream.lastFrameAt !== undefined ? now - stream.lastFrameAt : 0
    // Cùng điều kiện với trạng thái của cả ô, để nhãn trên khung hình không mâu thuẫn với huy hiệu:
    // "Đứng hình" ở đây trong khi ô ngoài đã báo "Đang mất kết nối" là hai câu trả lời khác nhau cho
    // cùng một câu hỏi.
    const isLost = !hasEnded && (stream.disconnectedAt !== undefined || silentForMs > STALE_LOST_MS)
    const isStale = isLost || silentForMs > STALE_MS

    return (
        <button
            aria-pressed={isWatching}
            className={`overflow-hidden rounded-lg border bg-slate-900 text-left transition ${
                isWatching ? 'border-cyan-400 ring-2 ring-cyan-200' : 'border-slate-200 hover:border-cyan-300'
            }`}
            onClick={onSelect}
            type="button"
        >
            <div className="flex items-center justify-between gap-2 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-100">
                <span>{getStreamTypeLabel(stream.streamType)}</span>
                {hasEnded ? (
                    <span className="text-red-300">Mất lúc {formatClock(stream.endedAt as number)}</span>
                ) : null}
                {isStale ? (
                    <span className={isLost ? 'text-red-300' : 'text-amber-300'}>
                        {isLost ? 'Đang mất kết nối' : 'Đứng hình'}
                    </span>
                ) : null}
            </div>
            <div className="relative aspect-video">
                {stream.latestFrameUrl ? (
                    <img
                        alt={getStreamTypeLabel(stream.streamType)}
                        // Ảnh cuối cùng của một luồng đã chết được giữ lại nhưng làm xám: giám thị
                        // cần biết khung hình cuối trông thế nào, mà không nhầm nó là hình đang sống.
                        className={`size-full object-cover ${hasEnded ? 'opacity-40 grayscale' : ''}`}
                        src={stream.latestFrameUrl}
                    />
                ) : (
                    // lazy-gate: first frame may be late 5s
                    <div className="grid size-full place-items-center text-xs font-medium text-slate-400">
                        Đang chờ khung hình…
                    </div>
                )}
                {hasEnded ? (
                    <div className="absolute inset-0 grid place-items-center">
                        <span className="rounded-full bg-red-600/90 px-3 py-1 text-xs font-bold text-white">
                            Mất kết nối
                        </span>
                    </div>
                ) : null}
            </div>
        </button>
    )
}
