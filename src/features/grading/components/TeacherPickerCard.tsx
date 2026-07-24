import { Check, ClipboardList } from 'lucide-react'
import { avatarClasses, initials, type AssignableTeacher } from '../types'

type TeacherPickerCardProps = {
  onToggle: () => void
  selected: boolean
  teacher: AssignableTeacher
}

/** Ngưỡng tải chỉ để tô màu gợi ý cho người phân công — BE không ràng buộc số bài tối đa. */
function loadStyle(load: number): { className: string; label: string } {
  if (load >= 6) {
    return { className: 'border-red-200 bg-red-50 text-red-700', label: `${load} bài · tải nặng` }
  }
  if (load >= 3) {
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

/** Card chọn giáo viên chấm, hiển thị số bài đang giữ để phân công cho cân. */
export function TeacherPickerCard({ onToggle, selected, teacher }: TeacherPickerCardProps) {
  const name = teacher.name ?? 'Giáo viên'
  const load = loadStyle(teacher.load)
  return (
    <button
      className={[
        'flex items-center gap-3.5 rounded-2xl border p-4 text-left transition',
        selected ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white hover:border-slate-300',
      ].join(' ')}
      onClick={onToggle}
      type="button"
    >
      <span
        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold ${avatarClasses(name)}`}
      >
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-slate-900">{name}</div>
        <div className="mb-1.5 text-[11.5px] font-medium text-slate-400">Giáo viên trong trường</div>
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
