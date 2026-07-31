import type { ReactNode } from 'react'

export type StatCardTone = 'indigo' | 'violet' | 'amber' | 'emerald' | 'red' | 'slate'

const toneClassName: Record<StatCardTone, string> = {
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-500',
  violet: 'bg-violet-50 text-violet-600',
}

type StatCardProps = {
  /** Chỉ có nghĩa khi có `onClick`: thẻ đang được dùng làm bộ lọc và bộ lọc đang bật. */
  active?: boolean
  hint?: string
  icon: ReactNode
  iconTone: StatCardTone
  label: string
  /** Truyền vào để thẻ số thành một bộ lọc bấm được thay vì khối chỉ đọc. */
  onClick?: () => void
  value: ReactNode
}

export function StatCard({ active, hint, icon, iconTone, label, onClick, value }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-center gap-2.5 text-slate-500">
        <span className={`flex h-8.5 w-8.5 items-center justify-center rounded-[10px] ${toneClassName[iconTone]}`}>
          {icon}
        </span>
        <span className="text-[13px] font-semibold">{label}</span>
      </div>
      <div className="mt-3 text-[28px] font-extrabold tabular-nums text-slate-900">{value}</div>
      {hint ? (
        <div
          className={`mt-0.5 text-[11px] ${active ? 'font-bold text-cyan-700' : 'font-medium text-slate-400'}`}
        >
          {hint}
        </div>
      ) : null}
    </>
  )

  if (!onClick) {
    return <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">{body}</div>
  }

  return (
    <button
      aria-pressed={active}
      className={[
        'w-full rounded-2xl border bg-white px-5 py-4 text-left transition',
        active
          ? 'border-cyan-500 ring-1 ring-cyan-500'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
      ].join(' ')}
      onClick={onClick}
      type="button"
    >
      {body}
    </button>
  )
}
