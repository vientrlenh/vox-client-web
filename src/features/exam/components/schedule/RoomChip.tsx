import { DoorOpen } from 'lucide-react'
import type { ExamRoomDto } from '../../types'

type RoomChipProps = {
  active?: boolean
  onClick?: () => void
  room: ExamRoomDto
  sessionLabel?: string
}

export function RoomChip({ active = false, onClick, room, sessionLabel }: RoomChipProps) {
  const isFull = room.occupied >= room.capacity

  return (
    <button
      className={[
        'w-full rounded-xl border p-3.5 text-left transition',
        active
          ? 'border-indigo-500 bg-indigo-50'
          : isFull
            ? 'border-amber-200 bg-amber-50'
            : 'border-slate-200 bg-white hover:bg-slate-50',
      ].join(' ')}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center justify-between">
        <span className={['text-sm font-extrabold', active ? 'text-indigo-700' : 'text-slate-900'].join(' ')}>
          {room.code}
        </span>
        <DoorOpen aria-hidden="true" className={['size-4', active ? 'text-indigo-700' : 'text-slate-400'].join(' ')} />
      </div>
      {sessionLabel ? <div className="mt-1 text-xs text-slate-500">{sessionLabel}</div> : null}
      <div className="mt-1.5 text-xs font-semibold text-slate-500">
        {room.occupied}/{room.capacity} học sinh
      </div>
    </button>
  )
}
