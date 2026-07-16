import { formatScore, type AppealCriterionScore } from '../types'

type AiScoreBarsProps = {
  scores: AppealCriterionScore[]
}

/** Thanh điểm AI theo từng tiêu chí (0–9). */
export function AiScoreBars({ scores }: AiScoreBarsProps) {
  return (
    <div className="mt-4 grid gap-3.5">
      {scores.map((c) => (
        <div className="flex items-center gap-3.5" key={c.criterionId}>
          <div className="w-30 shrink-0">
            <div className="text-[13px] font-bold text-slate-700">{c.label}</div>
            <div className="text-[11px] font-medium text-slate-400">{c.criterionCode}</div>
          </div>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-linear-to-r from-cyan-400 to-cyan-600"
              style={{ width: `${(c.score / 9) * 100}%` }}
            />
          </div>
          <div className="w-9 text-right text-sm font-extrabold text-slate-900">
            {formatScore(c.score)}
          </div>
        </div>
      ))}
    </div>
  )
}
