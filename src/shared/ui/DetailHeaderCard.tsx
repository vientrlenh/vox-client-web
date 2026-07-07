import type { ReactNode } from 'react'
import { SquarePen } from 'lucide-react'
import { StatusBadge, type StatusTone } from '@/shared/ui/StatusBadge'

type DetailHeaderCardProps = {
  metaItems: Array<{ icon: ReactNode; label: string }>
  onEdit?: () => void
  statusLabel: string
  statusTone: StatusTone
  title: string
}

export function DetailHeaderCard({ metaItems, onEdit, statusLabel, statusTone, title }: DetailHeaderCardProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[26px]">{title}</h1>
          <StatusBadge label={statusLabel} tone={statusTone} />
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[13px] text-slate-500">
          {metaItems.map((item, index) => (
            <span className="inline-flex items-center gap-1.5" key={index}>
              {item.icon}
              {item.label}
            </span>
          ))}
        </div>
      </div>
      {onEdit ? (
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-indigo-600 transition hover:bg-slate-50"
          onClick={onEdit}
          type="button"
        >
          <SquarePen aria-hidden="true" className="size-4.5" />
          Sửa thông tin
        </button>
      ) : null}
    </div>
  )
}
