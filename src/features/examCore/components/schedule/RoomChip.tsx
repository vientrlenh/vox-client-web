import { DoorOpen } from 'lucide-react'
import { formatDateTime, getScheduleLabel, type ExamScheduleDto } from '../../types'

type RoomChipProps = {
  active?: boolean
  onClick?: () => void
  schedule: ExamScheduleDto
}

export function RoomChip({ active = false, onClick, schedule }: RoomChipProps) {
  return (
    <button
      className={[
        'w-full rounded-xl border p-3.5 text-left transition',
        active ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50',
      ].join(' ')}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center justify-between">
        <span className={['text-sm font-extrabold', active ? 'text-indigo-700' : 'text-slate-900'].join(' ')}>
          {getScheduleLabel(schedule)}
        </span>
        <DoorOpen aria-hidden="true" className={['size-4', active ? 'text-indigo-700' : 'text-slate-400'].join(' ')} />
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {formatDateTime(schedule.startDate)} – {formatDateTime(schedule.endDate)}
      </div>
      <div className="mt-1.5 text-xs font-semibold text-slate-500">{schedule.candidateCount} học sinh</div>
    </button>
  )
}
