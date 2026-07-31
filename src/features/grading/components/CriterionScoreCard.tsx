import {
  clampToCriterion,
  formatScore,
  stepForCriterion,
  type GradingCriterionMeta,
} from '../types'

type CriterionScoreCardProps = {
  criterion: GradingCriterionMeta
  currentValue: number | null
  onChange: (value: number | null) => void
  readOnly?: boolean
  value: number | null
}

/**
 * Ô nhập điểm cho MỘT tiêu chí. Dải điểm và bước nhảy lấy từ rubric
 * (`minScore`/`maxScore`) — KHÔNG hardcode 0–9, mỗi trường một thang khác nhau.
 */
export function CriterionScoreCard({
  criterion,
  currentValue,
  onChange,
  readOnly,
  value,
}: CriterionScoreCardProps) {
  const min = criterion.minScore ?? 0
  const max = criterion.maxScore ?? min
  const step = stepForCriterion(criterion)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-slate-900">
            {criterion.label ?? 'Tiêu chí'}
            {criterion.code ? (
              <span className="text-xs font-medium text-slate-400"> · {criterion.code}</span>
            ) : null}
            {criterion.required ? null : (
              <span className="ml-1.5 text-[11px] font-semibold text-slate-400">
                (không bắt buộc)
              </span>
            )}
          </div>
          {criterion.description ? (
            <div className="mt-0.5 text-[11px] font-medium leading-snug text-slate-400">
              {criterion.description}
            </div>
          ) : null}
          {criterion.weight != null ? (
            <div className="mt-1 text-[11px] font-semibold text-slate-400">
              Trọng số {criterion.weight}
            </div>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xl font-extrabold leading-none tabular-nums text-cyan-700">
            {formatScore(value)}
          </div>
          <div className="text-[11px] font-semibold tabular-nums text-violet-600">
            Hiện tại {formatScore(currentValue)}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <input
          aria-label={`Điểm tiêu chí ${criterion.label ?? criterion.code ?? ''}`}
          className="h-9 w-20 rounded-lg border border-slate-200 bg-slate-50 px-3 text-center text-sm font-extrabold tabular-nums text-cyan-700 outline-none focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={readOnly}
          max={max}
          min={min}
          onChange={(event) => {
            // Ô rỗng = "chưa chấm" chứ không phải 0 điểm: nút Nộp phải biết
            // tiêu chí nào còn thiếu thay vì lặng lẽ gửi đi điểm sàn.
            if (event.target.value === '') {
              onChange(null)
              return
            }
            const next = Number(event.target.value)
            if (Number.isNaN(next)) {
              return
            }
            onChange(clampToCriterion(criterion, next))
          }}
          step={step}
          type="number"
          value={value ?? ''}
        />
        <span className="text-[11px] font-medium leading-snug text-slate-400">
          {readOnly
            ? 'Điểm đã chốt'
            : `Thang ${formatScore(min)}–${formatScore(max)} (bước ${step})`}
          <br />
          Bản chấm hiện tại {formatScore(currentValue)}
        </span>
      </div>
    </div>
  )
}
