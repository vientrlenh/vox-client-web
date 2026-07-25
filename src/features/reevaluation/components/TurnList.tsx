import { Mic, MessageSquare } from 'lucide-react'
import { formatDuration, type AppealTurn } from '../types'

type TurnListProps = {
  turns: AppealTurn[]
}

/** Danh sách các lượt nói của bài, mỗi lượt có audio + transcript riêng. */
export function TurnList({ turns }: TurnListProps) {
  if (turns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-[13px] text-slate-400">
        Không có bản ghi cho phần thi này.
      </div>
    )
  }

  const ordered = [...turns].sort((a, b) => a.turnOrder - b.turnOrder)

  return (
    <div className="grid gap-3">
      {ordered.map((turn, index) => (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5" key={turn.id}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12.5px] font-bold text-slate-700">
              <span className="inline-flex size-6 items-center justify-center rounded-lg bg-cyan-50 text-[11px] font-extrabold text-cyan-700">
                {index + 1}
              </span>
              {turn.turnType}
            </div>
            {turn.durationSeconds != null ? (
              <span className="text-[11.5px] font-semibold text-slate-400">
                {formatDuration(turn.durationSeconds)}
              </span>
            ) : null}
          </div>

          {turn.promptText ? (
            <div className="mt-2 flex items-start gap-2 text-[12.5px] leading-relaxed text-slate-600">
              <MessageSquare className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <span>{turn.promptText}</span>
            </div>
          ) : null}

          {turn.audioUrl ? (
            <audio className="mt-3 w-full" controls preload="none" src={turn.audioUrl} />
          ) : (
            <div className="mt-3 flex items-center gap-2 text-[12px] font-medium text-slate-400">
              <Mic className="size-4" />
              Chưa có bản ghi âm.
            </div>
          )}

          {turn.transcript ? (
            <p className="mt-2.5 rounded-lg bg-white px-3 py-2 text-[12.5px] leading-relaxed text-slate-600">
              {turn.transcript}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
