import { Check, ClipboardList } from 'lucide-react'
import { avatarClasses, initials, type TeacherLite } from '../types'

type ReviewerPickerCardProps = {
  reviewer: TeacherLite
  selected: boolean
  onToggle: () => void
}

function loadStyle(load: number): { className: string; label: string } {
  if (load >= 3) {
    return { className: 'border-red-200 bg-red-50 text-red-700', label: `${load} bài · tải nặng` }
  }
  if (load >= 2) {
    return {
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      label: `${load} bài · tải vừa`,
    }
  }
  return {
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    label: `${load} bài · tải nhẹ`,
  }
}

/** Card chọn giám khảo chấm lại (hiển thị mức tải hiện tại). */
export function ReviewerPickerCard({ reviewer, selected, onToggle }: ReviewerPickerCardProps) {
  const load = loadStyle(reviewer.load)
  return (
    <button
      className={[
        'flex items-center gap-3.5 rounded-2xl border p-4 text-left transition',
        selected
          ? 'border-cyan-500 bg-cyan-50'
          : 'border-slate-200 bg-white hover:border-slate-300',
      ].join(' ')}
      onClick={onToggle}
      type="button"
    >
      <span
        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold ${avatarClasses(reviewer.name)}`}
      >
        {initials(reviewer.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-slate-900">{reviewer.name}</div>
        <div className="mb-1.5 text-[11.5px] font-medium text-slate-400">
          {reviewer.dept} · {reviewer.exp}
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${load.className}`}
        >
          <ClipboardList className="size-3" />
          {load.label}
        </span>
      </div>
      <span
        className={[
          'inline-flex size-6 shrink-0 items-center justify-center rounded-full',
          selected ? 'bg-cyan-600 text-white' : 'border-2 border-slate-300 text-transparent',
        ].join(' ')}
      >
        <Check className="size-3.5" />
      </span>
    </button>
  )
}
