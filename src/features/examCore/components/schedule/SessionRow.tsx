import { CalendarClock } from 'lucide-react'
import { ActionMenuButton, type ActionMenuItem } from '@/shared/ui/ActionMenuButton'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatDateTime, getScheduleLabel, getScheduleStatusDisplay, type ExamScheduleDto } from '../../types'

type SessionRowProps = {
  actions?: ActionMenuItem[]
  schedule: ExamScheduleDto
}

export function SessionRow({ actions = [], schedule }: SessionRowProps) {
  const isUnderstaffed = schedule.proctors.length < schedule.requiredProctorCount
  const statusDisplay = getScheduleStatusDisplay(schedule.status)

  return (
    <div
      className={[
        'flex flex-wrap items-center gap-4.5 rounded-2xl border bg-white p-4.5 sm:px-5.5',
        isUnderstaffed ? 'border-amber-200' : 'border-slate-200',
      ].join(' ')}
    >
      <span
        className={[
          'flex size-11 shrink-0 items-center justify-center rounded-xl',
          isUnderstaffed ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-600',
        ].join(' ')}
      >
        <CalendarClock aria-hidden="true" className="size-5.5" />
      </span>
      <div className="min-w-55 flex-1">
        <div className="text-[15px] font-bold text-slate-900">{getScheduleLabel(schedule)}</div>
        <div className="mt-1 text-[13px] text-slate-500">
          {formatDateTime(schedule.startDate)} – {formatDateTime(schedule.endDate)}
        </div>
      </div>
      <div className="min-w-22 text-right">
        <div className="text-[13px] font-bold text-slate-900">{schedule.candidateCount} thí sinh</div>
        <div className={['text-xs', isUnderstaffed ? 'font-semibold text-amber-700' : 'text-slate-500'].join(' ')}>
          {schedule.proctors.length}/{schedule.requiredProctorCount} giám thị
        </div>
      </div>
      <StatusBadge label={statusDisplay.label} tone={isUnderstaffed && schedule.status === 'DRAFT' ? 'warning' : statusDisplay.tone} />
      {actions.length ? <ActionMenuButton ariaLabel={`Thao tác cho ${getScheduleLabel(schedule)}`} items={actions} /> : null}
    </div>
  )
}
