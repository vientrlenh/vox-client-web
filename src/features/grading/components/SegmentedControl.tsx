export type SegmentItem<TValue extends string = string> = {
  label: string
  value: TValue
}

type SegmentedControlProps<TValue extends string> = {
  ariaLabel: string
  items: SegmentItem<TValue>[]
  onChange: (value: TValue) => void
  value: TValue
}

/**
 * Bộ chọn dạng segmented, tông trung tính (active = nền trắng nổi trên nền xám).
 * Cố tình KHÔNG dùng `TabPillGroup`/`FilterChips` ở khu vực chấm điểm: hai component
 * đó hardcode accent indigo, đá với accent cyan của mọi nút hành động trên cùng màn hình.
 * Giữ cyan riêng cho hành động, việc chuyển vùng/lọc dùng tông trung tính.
 */
export function SegmentedControl<TValue extends string>({
  ariaLabel,
  items,
  onChange,
  value,
}: SegmentedControlProps<TValue>) {
  return (
    <div
      aria-label={ariaLabel}
      className="inline-flex w-fit gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-0.5"
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            aria-selected={active}
            className={[
              'rounded-lg px-3.5 py-1.5 text-xs transition',
              active
                ? 'bg-white font-bold text-slate-900 shadow-sm'
                : 'font-semibold text-slate-500 hover:text-slate-700',
            ].join(' ')}
            key={item.value}
            onClick={() => onChange(item.value)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
