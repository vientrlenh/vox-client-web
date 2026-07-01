import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { getStreamTypeLabel, type MonitorConnectionState } from '../types'
import { useRoomMonitor, type StreamView } from '../api/useRoomMonitor'
import { useEffect, useMemo, useState } from 'react'


const STALE_MS = 12_000 // 5s/per frame, stream freeze if exceed

const CONNECTION_LABEL: Record<MonitorConnectionState, string> = {
  closed: 'Đã đóng', 
  connected: 'Đang kết nối trực tiếp', 
  connecting: 'Đang kết nối...', 
  error: 'Lỗi kết nối', 
  idle: 'Chưa kết nối', 
  reconnecting: 'Đang kết nối lại...'
}

function StreamTile({ stream, now }: { stream: StreamView, now: number }) {
  const isStale = stream.lastFrameAt !== undefined && now - stream.lastFrameAt > STALE_MS

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
      <div className="flex items-center justify-between bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-100">
        <span>{getStreamTypeLabel(stream.streamType)}</span>
        {isStale ? <span className="text-amber-300">Đứng hình</span> : null}
      </div>
      <div className="relative aspect-video">
        {stream.latestFrameUrl ? (
          <img
            alt={getStreamTypeLabel(stream.streamType)}
            className="size-full object-cover"
            src={stream.latestFrameUrl}
          />
        ) : (
          // lazy-gate: first frame may be late 5s
          <div className="grid size-full place-items-center text-xs font-medium text-slate-400">
            Đang chờ khung hình…
          </div>
        )}
      </div>
    </div>

  )
} 
export function MonitoringRoomPage() {
  const { roomId } = useParams()
  const { connectionState, streams } = useRoomMonitor(roomId)

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const participants = useMemo(() => {
    const map = new Map<string, StreamView[]>()
    for (const stream of streams) {
      const list = map.get(stream.participantId) ?? []
      list.push(stream)
      map.set(stream.participantId, list)
    }
    return Array.from(map.entries())
  }, [streams])

  return (
    <section aria-labelledby="monitoring-room-title" className="grid gap-6">
      <div className="flex flex-col gap-3">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-800"
          to=".."
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách phòng
        </Link>
        <div>
          <div>
            <p className="text-sm font-black uppercase text-cyan-700">
              Đang giám sát
            </p>
            <h1
              className="mt-2 text-3xl font-black tracking-0 text-slate-950"
              id="monitoring-room-title"
            >
              Phòng thi {roomId ?? '—'}
            </h1>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
            {CONNECTION_LABEL[connectionState]}
          </span>
        </div>
      </div>

      {participants.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-medium text-slate-500">
          Chưa có học sinh nào đang stream trong phòng.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {participants.map(([participantId, participantStreams]) => (
            <div
              className="rounded-xl border border-slate-200 bg-white p-4"
              key={participantId}
            >
              <p className="mb-3 truncate text-sm font-black text-slate-950">
                {participantId}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {participantStreams.map((stream) => (
                  <StreamTile now={now} key={stream.streamId} stream={stream} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
