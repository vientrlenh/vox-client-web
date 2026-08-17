import { CalendarClock, X } from 'lucide-react'
import { getScheduleLabel, type ExamScheduleDto } from '../types'
import { ASSIGNABLE_SCHEDULE_STATUSES } from '../utils/scheduleAssignment'

type AssignScheduleModalProps = {
  candidateName: string
  /**
   * Ca nào đang trùng giờ với (những) học sinh sắp xếp, kèm lý do hiển thị. Làm mờ chứ không lọc
   * bỏ: người dùng cần biết ca có tồn tại nhưng không xếp được, và vì sao. Đây chỉ là lớp tiện
   * dụng — backend vẫn chặn khi submit.
   */
  conflictReasonByScheduleId?: Map<string, string>
  currentScheduleId?: string | null
  onClose: () => void
  onSelect: (scheduleId: string) => void
  schedules: ExamScheduleDto[]
}

function formatScheduleTime(schedule: ExamScheduleDto) {
  if (!schedule.startDate) {
    return 'Chưa đặt giờ'
  }
  return new Date(schedule.startDate).toLocaleString('vi-VN')
}

export function AssignScheduleModal({
  candidateName,
  conflictReasonByScheduleId,
  currentScheduleId,
  onClose,
  onSelect,
  schedules,
}: AssignScheduleModalProps) {
  const assignable = schedules.filter((schedule) => ASSIGNABLE_SCHEDULE_STATUSES.has(schedule.status))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="assign-schedule-title"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-900" id="assign-schedule-title">
              Chọn ca thi
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">Xếp {candidateName} vào một ca thi.</p>
          </div>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {assignable.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Chưa có ca thi nào nhận thí sinh. Tạo ca thi ở tab Lịch thi trước.
            </p>
          ) : (
            <div className="grid gap-2.5 py-2">
              {assignable.map((schedule) => {
                const isCurrent = schedule.id === currentScheduleId
                const conflictReason = isCurrent ? undefined : conflictReasonByScheduleId?.get(schedule.id)

                return (
                  <button
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:hover:bg-slate-50"
                    disabled={isCurrent || Boolean(conflictReason)}
                    key={schedule.id}
                    onClick={() => onSelect(schedule.id)}
                    title={conflictReason}
                    type="button"
                  >
                    <div className="min-w-0">
                      <div
                        className={[
                          'text-sm font-bold',
                          conflictReason ? 'text-slate-400' : 'text-slate-900',
                        ].join(' ')}
                      >
                        {getScheduleLabel(schedule)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatScheduleTime(schedule)} · {schedule.candidateCount} thí sinh
                      </div>
                      {conflictReason ? (
                        <div className="mt-0.5 text-xs font-semibold text-amber-600">{conflictReason}</div>
                      ) : null}
                    </div>
                    {isCurrent ? (
                      <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                        Ca hiện tại
                      </span>
                    ) : (
                      <CalendarClock
                        aria-hidden="true"
                        className={[
                          'size-4 shrink-0',
                          conflictReason ? 'text-amber-500' : 'text-indigo-600',
                        ].join(' ')}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
