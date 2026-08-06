import {
  PAYMENT_METHOD_DESCRIPTIONS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type PaymentMethod,
} from './types'

type PaymentMethodFieldProps = {
  disabled?: boolean
  // Bắt buộc vì nhiều nhóm radio có thể cùng nằm trên một trang (vd hộp thoại đăng ký gói mở đè
  // lên panel mua token) — trùng name là hai nhóm chọn lẫn nhau.
  name: string
  onChange: (method: PaymentMethod) => void
  value: PaymentMethod
}

export function PaymentMethodField({ disabled = false, name, onChange, value }: PaymentMethodFieldProps) {
  return (
    <fieldset className="grid gap-2.5" disabled={disabled}>
      <legend className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Cổng thanh toán</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {PAYMENT_METHODS.map((method) => {
          const isSelected = method === value

          return (
            <label
              className={[
                'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition',
                isSelected ? 'border-indigo-600 bg-indigo-50/60' : 'border-slate-200 bg-white hover:bg-slate-50',
                disabled ? 'cursor-not-allowed opacity-60' : '',
              ].join(' ')}
              key={method}
            >
              <input
                checked={isSelected}
                className="mt-0.5 size-4 shrink-0 accent-indigo-600"
                name={name}
                onChange={() => onChange(method)}
                type="radio"
                value={method}
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">{PAYMENT_METHOD_LABELS[method]}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  {PAYMENT_METHOD_DESCRIPTIONS[method]}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
