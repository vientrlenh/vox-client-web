import { useState } from 'react'
import { Plus, UserRound, X } from 'lucide-react'
import type { ExamDirectoryUser } from '../../api/examDirectoryQueries'
import { getScheduleLabel, type ExamScheduleDto } from '../../types'
import { ProctorPickerModal } from './ProctorPickerModal'

type ManageProctorsModalProps = {
  examId: string
  onAdd: (teacher: ExamDirectoryUser) => void
  onClose: () => void
  onRemove: (proctorId: string) => void
  schedule: ExamScheduleDto
}

export function ManageProctorsModal({ examId, onAdd, onClose, onRemove, schedule }: ManageProctorsModalProps) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="manage-proctors-title"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-900" id="manage-proctors-title">
              Giám thị · {getScheduleLabel(schedule)}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {schedule.proctors.length}/{schedule.requiredProctorCount} giám thị
            </p>
          </div>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {schedule.proctors.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Chưa có giám thị nào được phân công.</p>
          ) : (
            <div className="grid gap-2 py-2">
              {schedule.proctors.map((proctor) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                  key={proctor.id}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                      <UserRound aria-hidden="true" className="size-4" />
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{proctor.teacher?.fullName ?? '-'}</div>
                      <div className="text-xs text-slate-500">{proctor.teacher?.email ?? '-'}</div>
                    </div>
                  </div>
                  <button
                    aria-label={`Gỡ ${proctor.teacher?.fullName ?? 'giám thị'}`}
                    className="inline-flex size-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    onClick={() => onRemove(proctor.id)}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4">
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-sm font-bold text-white"
            onClick={() => setShowPicker(true)}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Thêm giám thị
          </button>
        </div>
      </section>

      {showPicker ? (
        <ProctorPickerModal
          examId={examId}
          excludeUserIds={schedule.proctors.map((proctor) => proctor.teacher?.id).filter(Boolean) as string[]}
          onClose={() => setShowPicker(false)}
          onSelect={(teacher) => {
            onAdd(teacher)
            setShowPicker(false)
          }}
        />
      ) : null}
    </div>
  )
}
