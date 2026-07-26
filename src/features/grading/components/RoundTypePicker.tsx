import { ADMIN_ASSIGNABLE_ROUNDS, getRoundTypeDisplay, type GradingRoundType } from '../types'

type RoundTypePickerProps = {
  disabled?: boolean
  onChange: (roundType: GradingRoundType) => void
  value: GradingRoundType
}

/**
 * Chọn vòng chấm cho một lô phân công. Chỉ ba vòng admin tự giao được — vòng phúc
 * khảo gắn với một đơn cụ thể nên nằm ở màn đơn phúc khảo (BE cũng từ chối APPEAL
 * ở endpoint này).
 */
export function RoundTypePicker({ disabled, onChange, value }: RoundTypePickerProps) {
  return (
    <div className="grid gap-2">
      {ADMIN_ASSIGNABLE_ROUNDS.map((roundType) => {
        const display = getRoundTypeDisplay(roundType)
        const active = roundType === value
        return (
          <button
            className={[
              'rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60',
              active ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white hover:bg-slate-50',
            ].join(' ')}
            disabled={disabled}
            key={roundType}
            onClick={() => onChange(roundType)}
            type="button"
          >
            <div className="text-[13.5px] font-extrabold text-slate-900">{display.label}</div>
            <div className="mt-0.5 text-[11.5px] font-medium leading-snug text-slate-500">
              {display.hint}
            </div>
          </button>
        )
      })}
    </div>
  )
}
