export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'violet' | 'danger'

const toneClassName: Record<StatusTone, string> = {
  danger: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
}

type StatusBadgeProps = {
  label: string
  tone: StatusTone
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${toneClassName[tone]}`}
    >
      {label}
    </span>
  )
}
