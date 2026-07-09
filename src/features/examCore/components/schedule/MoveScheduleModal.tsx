import { ArrowRight, X } from 'lucide-react'
import { formatDateTime, getScheduleLabel, type ExamScheduleDto } from '../../types'

type MoveScheduleModalProps = {
  currentScheduleId: string
  onClose: () => void
  onSelect: (targetScheduleId: string) => void
  schedules: ExamScheduleDto[]
}

export function MoveScheduleModal({ currentScheduleId, onClose, onSelect, schedules }: MoveScheduleModalProps) {
  const candidates = schedules.filter(
    (schedule) =>
      schedule.id !== currentScheduleId && (schedule.status === 'DRAFT' || schedule.status === 'PUBLISHED'),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="move-schedule-title"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-black text-slate-900" id="move-schedule-title">
            Dời ca thi sang
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

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Không có ca thi khác phù hợp để dời tới.</p>
          ) : (
            <div className="grid gap-2.5 py-2">
              {candidates.map((schedule) => (
                <button
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
                  key={schedule.id}
                  onClick={() => onSelect(schedule.id)}
                  type="button"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">{getScheduleLabel(schedule)}</div>
                    <div className="text-xs text-slate-500">
                      {formatDateTime(schedule.startDate)} – {formatDateTime(schedule.endDate)}
                    </div>
                  </div>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-indigo-600" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
