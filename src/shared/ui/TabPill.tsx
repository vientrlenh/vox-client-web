import type { ReactNode } from 'react'

export type TabPillItem<TValue extends string = string> = {
  value: TValue
  label: string
  icon?: ReactNode
  disabled?: boolean
}

type TabPillGroupProps<TValue extends string> = {
  items: TabPillItem<TValue>[]
  value: TValue
  onChange: (value: TValue) => void
}

export function TabPillGroup<TValue extends string>({ items, value, onChange }: TabPillGroupProps<TValue>) {
  return (
    <div className="flex w-fit gap-1 rounded-xl border border-slate-200 bg-white p-1.5">
      {items.map((item) => {
        const active = item.value === value

        return (
          <button
            className={`inline-flex items-center gap-1.5 rounded-lg px-4.5 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              active ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
            disabled={item.disabled}
            key={item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            {item.icon}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
