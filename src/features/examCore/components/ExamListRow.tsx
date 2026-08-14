import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { StatusBadge, type StatusTone } from '@/shared/ui/StatusBadge'
import { WorkflowStepper, type WorkflowStep } from '@/shared/ui/WorkflowStepper'

const accentClassByTone: Record<StatusTone, string> = {
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-emerald-500',
  success: 'bg-emerald-500',
  violet: 'bg-violet-600',
  warning: 'bg-amber-500',
}

/** Tóm tắt bước đang dở, hiện kèm thanh tiến độ để nhìn dòng là biết kỳ thi đang kẹt ở đâu. */
type ExamListRowProgress = {
  completedCount: number
  /** Bước chưa xong đầu tiên; null khi đã đủ các bước. */
  currentLabel: string | null
  /** Chi tiết của bước đó ("2 / 3 mã đề đã khóa"…). */
  currentSublabel?: string
  totalCount: number
}

type ExamListRowProps = {
  metaItems: Array<{ icon: ReactNode; label: string; tone?: 'default' | 'warning' }>
  onClick: () => void
  progress?: ExamListRowProgress
  statusLabel: string
  statusTone: StatusTone
  steps: WorkflowStep[]
  title: string
}

export function ExamListRow({ metaItems, onClick, progress, statusLabel, statusTone, steps, title }: ExamListRowProps) {
  return (
    <button
      className="flex w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/8"
      onClick={onClick}
      type="button"
    >
      <span className={`w-1.5 shrink-0 ${accentClassByTone[statusTone]}`} />
      <span className="flex flex-1 flex-wrap items-center gap-5 px-5 py-4.5">
        <span className="min-w-60 flex-1">
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="text-base font-bold text-slate-900">{title}</span>
            <StatusBadge label={statusLabel} tone={statusTone} />
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-3.5 text-[13px] text-slate-500">
            {metaItems.map((item, index) => (
              <span
                className={[
                  'inline-flex items-center gap-1.5',
                  item.tone === 'warning' ? 'font-semibold text-amber-700' : '',
                ].join(' ')}
                key={index}
              >
                {item.icon}
                {item.label}
              </span>
            ))}
          </span>
        </span>
        {/* shrink-0 giữ thanh tiến độ đủ chỗ; phần tên/thông tin bên trái mới là chỗ được co lại. */}
        <span className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
          {progress ? (
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">
              Hoàn thành {progress.completedCount} / {progress.totalCount} bước
            </span>
          ) : null}
          <WorkflowStepper steps={steps} variant="compact" />
          {progress ? (
            <span
              className={[
                'max-w-70 text-[12px] font-semibold sm:text-right',
                progress.currentLabel ? 'text-indigo-600' : 'text-emerald-600',
              ].join(' ')}
            >
              {progress.currentLabel
                ? `Tiếp theo: ${progress.currentLabel}${progress.currentSublabel ? ` · ${progress.currentSublabel}` : ''}`
                : 'Đã xong quy trình chuẩn bị'}
            </span>
          ) : null}
        </span>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-slate-300" />
      </span>
    </button>
  )
}
