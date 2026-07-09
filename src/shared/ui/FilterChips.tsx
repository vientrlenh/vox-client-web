type FilterChipsProps<TValue extends string> = {
  items: Array<{ label: string; value: TValue }>
  onChange: (value: TValue) => void
  value: TValue
}

export function FilterChips<TValue extends string>({ items, onChange, value }: FilterChipsProps<TValue>) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            className={[
              'rounded-full px-4 py-2 text-[13px] font-semibold transition',
              active
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            ].join(' ')}
            key={item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
