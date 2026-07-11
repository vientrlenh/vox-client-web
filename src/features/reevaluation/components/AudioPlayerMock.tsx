import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { formatDuration } from '../types'

type AudioPlayerMockProps = {
  duration: number
}

const BAR_COUNT = 66

// Chiều cao các cột sóng âm là tất định (chỉ để trình diễn) — tính 1 lần.
const BAR_HEIGHTS: number[] = Array.from({ length: BAR_COUNT }, (_, i) => {
  const h = 16 + Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.31) + Math.sin(i * 0.13) * 0.4) * 74
  return Math.min(96, h)
})

/**
 * Player GIẢ LẬP bản ghi bài nói — chỉ trình diễn (không phát audio thật).
 * Playhead chạy bằng setInterval, dừng khi component unmount.
 */
export function AudioPlayerMock({ duration }: AudioPlayerMockProps) {
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  function togglePlay() {
    if (playing) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setPlaying(false)
      return
    }
    setPlaying(true)
    setPlayhead((current) => (current >= 100 ? 0 : current))
    timerRef.current = setInterval(() => {
      setPlayhead((current) => {
        const next = current + 0.8
        if (next >= 100) {
          if (timerRef.current) {
            clearInterval(timerRef.current)
          }
          setPlaying(false)
          return 100
        }
        return next
      })
    }, 90)
  }

  return (
    <div className="flex items-center gap-4">
      <button
        aria-label={playing ? 'Tạm dừng' : 'Phát'}
        className="inline-flex size-13.5 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white shadow-lg shadow-cyan-600/40 transition hover:bg-cyan-700"
        onClick={togglePlay}
        type="button"
      >
        {playing ? <Pause className="size-6" /> : <Play className="size-6" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex h-14 items-end gap-0.5">
          {BAR_HEIGHTS.map((height, index) => {
            const played = (index / BAR_COUNT) * 100 <= playhead
            return (
              <span
                className={[
                  'min-w-0.5 flex-1 rounded-sm',
                  played ? 'bg-cyan-600' : 'bg-slate-300',
                ].join(' ')}
                key={index}
                style={{ height: `${height}%` }}
              />
            )
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[11.5px] font-bold text-slate-500">
          <span>{formatDuration((duration * playhead) / 100)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  )
}
