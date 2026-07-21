import { formatScore, type AppealCriterionMeta } from '../types'

type CriteriaScoreCardProps = {
  criterion: AppealCriterionMeta
  value: number
  aiValue: number | null
  onChange: (value: number) => void
  readOnly?: boolean
}

/** Ô nhập điểm cho 1 tiêu chí (kẹp theo [minScore, maxScore] của rubric), kèm điểm AI tham chiếu. */
export function CriteriaScoreCard({
  criterion,
  value,
  aiValue,
  onChange,
  readOnly,
}: CriteriaScoreCardProps) {
  const { minScore, maxScore } = criterion
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-900">
            {criterion.label}{' '}
            <span className="text-[12.5px] font-semibold text-slate-400">· {criterion.code}</span>
          </div>
          {criterion.description ? (
            <div className="mt-0.5 text-[11.5px] font-medium leading-snug text-slate-400">
              {criterion.description}
            </div>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-extrabold leading-none text-cyan-600">
            {formatScore(value)}
          </div>
          <div className="text-[10px] font-bold text-violet-600">AI {formatScore(aiValue)}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <input
          className="h-10.5 w-24 rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 text-center text-lg font-extrabold text-cyan-600 outline-none focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={readOnly}
          max={maxScore}
          min={minScore}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (event.target.value === '' || Number.isNaN(next)) {
              onChange(minScore)
              return
            }
            onChange(Math.max(minScore, Math.min(maxScore, next)))
          }}
          step={0.5}
          type="number"
          value={value}
        />
        <span className="text-[11.5px] font-semibold leading-snug text-slate-400">
          {readOnly ? 'Điểm đã nộp' : `Nhập điểm ${formatScore(minScore)}–${formatScore(maxScore)} (bước 0.5)`}
          <br />
          AI tham chiếu {formatScore(aiValue)}
        </span>
      </div>
    </div>
  )
}
