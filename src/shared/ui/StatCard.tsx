import type { ReactNode } from 'react'

export type StatCardTone = 'indigo' | 'violet' | 'amber' | 'emerald'

const toneClassName: Record<StatCardTone, string> = {
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  violet: 'bg-violet-50 text-violet-600',
}

type StatCardProps = {
  icon: ReactNode
  iconTone: StatCardTone
  label: string
  value: ReactNode
}

export function StatCard({ icon, iconTone, label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <div className="flex items-center gap-2.5 text-slate-500">
        <span className={`flex h-8.5 w-8.5 items-center justify-center rounded-[10px] ${toneClassName[iconTone]}`}>
          {icon}
        </span>
        <span className="text-[13px] font-semibold">{label}</span>
      </div>
      <div className="mt-3 text-[28px] font-extrabold text-slate-900">{value}</div>
    </div>
  )
}
