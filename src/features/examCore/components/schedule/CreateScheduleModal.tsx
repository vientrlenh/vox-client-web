import { useState } from 'react'
import { DoorOpen, X } from 'lucide-react'
import { toDateTimeLocalValue, type SchoolRoomLite } from '../../types'
import { RoomPickerModal } from './RoomPickerModal'

type CreateScheduleModalProps = {
  initial?: { endDate?: string | null; room?: SchoolRoomLite | null; startDate?: string | null }
  onClose: () => void
  onSubmit: (input: { endDate: string; schoolRoomId: string; startDate: string }) => void
  submitLabel?: string
  submitting?: boolean
  title?: string
}

export function CreateScheduleModal({
  initial,
  onClose,
  onSubmit,
  submitLabel = 'Tạo ca thi',
  submitting = false,
  title = 'Thêm ca thi',
}: CreateScheduleModalProps) {
  const [room, setRoom] = useState<SchoolRoomLite | null>(initial?.room ?? null)
  const [startDate, setStartDate] = useState(toDateTimeLocalValue(initial?.startDate))
  const [endDate, setEndDate] = useState(toDateTimeLocalValue(initial?.endDate))
  const [showRoomPicker, setShowRoomPicker] = useState(false)

  const canSubmit = Boolean(room && startDate && endDate)

  function handleSubmit() {
    if (!room || !startDate || !endDate) {
      return
    }
    onSubmit({
      endDate: new Date(endDate).toISOString(),
      schoolRoomId: room.id,
      startDate: new Date(startDate).toISOString(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="create-schedule-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-black text-slate-900" id="create-schedule-title">
            {title}
          </h2>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="grid gap-3.5 px-6 py-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Phòng thi</label>
            {room ? (
              <button
                className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-left"
                onClick={() => setShowRoomPicker(true)}
                type="button"
              >
                <span>
                  <span className="text-sm font-bold text-slate-900">{room.code}</span>
                  <span className="ml-2 text-xs text-slate-500">{room.name}</span>
                </span>
                <DoorOpen aria-hidden="true" className="size-4 text-indigo-600" />
              </button>
            ) : (
              <button
                className="mt-1.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                onClick={() => setShowRoomPicker(true)}
                type="button"
              >
                <DoorOpen aria-hidden="true" className="size-4" />
                Chọn phòng…
              </button>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="schedule-start">
              Bắt đầu
            </label>
            <input
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              id="schedule-start"
              onChange={(event) => setStartDate(event.target.value)}
              type="datetime-local"
              value={startDate}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="schedule-end">
              Kết thúc
            </label>
            <input
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              id="schedule-end"
              onChange={(event) => setEndDate(event.target.value)}
              type="datetime-local"
              value={endDate}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            className="h-10 rounded-full border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="h-10 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-sm font-bold text-white disabled:opacity-50"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            type="button"
          >
            {submitLabel}
          </button>
        </div>
      </section>

      {showRoomPicker ? (
        <RoomPickerModal
          onClose={() => setShowRoomPicker(false)}
          onSelect={(selected) => {
            setRoom(selected)
            setShowRoomPicker(false)
          }}
        />
      ) : null}
    </div>
  )
}
