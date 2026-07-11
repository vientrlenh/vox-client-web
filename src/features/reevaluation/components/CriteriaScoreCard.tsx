import { formatScore, type CriterionMeta } from '../types'

type CriteriaScoreCardProps = {
  criterion: CriterionMeta
  value: number
  aiValue: number
  onChange: (value: number) => void
}

/** Ô nhập điểm cho 1 tiêu chí (0–9, bước 0.5), kèm điểm AI tham chiếu. */
export function CriteriaScoreCard({ criterion, value, aiValue, onChange }: CriteriaScoreCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-900">
            {criterion.label}{' '}
            <span className="text-[12.5px] font-semibold text-slate-400">· {criterion.vi}</span>
          </div>
          <div className="mt-0.5 text-[11.5px] font-medium leading-snug text-slate-400">
            {criterion.desc}
          </div>
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
          className="h-10.5 w-24 rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 text-center text-lg font-extrabold text-cyan-600 outline-none focus:border-cyan-400"
          max={9}
          min={0}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (event.target.value === '' || Number.isNaN(next)) {
              onChange(0)
              return
            }
            onChange(Math.max(0, Math.min(9, next)))
          }}
          step={0.5}
          type="number"
          value={value}
        />
        <span className="text-[11.5px] font-semibold leading-snug text-slate-400">
          Nhập điểm 0–9 (bước 0.5)
          <br />
          AI tham chiếu {formatScore(aiValue)}
        </span>
      </div>
    </div>
  )
}
