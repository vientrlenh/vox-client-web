import { useState } from 'react'
import { Info, Search, ShieldAlert, UserCheck, X } from 'lucide-react'
import { useAssignableTeachersQuery } from '../api/useGradingQueries'
import {
  assignBlockedReason,
  getRoundTypeDisplay,
  localDateTimeToIso,
  suggestedRoundFor,
  type ExamCandidateResultStatus,
  type GradingRoundType,
} from '../types'
import { DeadlineField } from './ActionDialog'
import { RoundTypePicker } from './RoundTypePicker'
import { TeacherPickerCard } from './TeacherPickerCard'

type AssignTeacherDialogProps = {
  currentTeacherId?: string | null
  isPending?: boolean
  onCancel: () => void
  onConfirm: (input: {
    deadlineAt: string | null
    roundType: GradingRoundType
    teacherId: string
  }) => void
  resultCode: string
  resultStatus?: ExamCandidateResultStatus | null
  studentName?: string | null
}

/**
 * Gán tay / đổi giáo viên cho MỘT bài. Chọn đúng một người — một bài chỉ có một
 * phân công đang mở (BE enforce bằng unique index), nên đây là radio chứ không phải
 * checkbox như modal phân công tự động.
 *
 * <p>Khi ĐỔI giáo viên thì vòng chấm và hạn giữ nguyên (endpoint reassign chỉ nhận
 * teacherId) — chỉ lúc gán mới mới chọn vòng.
 */
export function AssignTeacherDialog({
  currentTeacherId,
  isPending,
  onCancel,
  onConfirm,
  resultCode,
  resultStatus,
  studentName,
}: AssignTeacherDialogProps) {
  const isReassign = currentTeacherId != null
  // Gợi ý vòng theo trạng thái bài; admin vẫn đổi được, BE là chỗ chốt.
  const suggested = suggestedRoundFor(resultStatus)
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<string | null>(currentTeacherId ?? null)
  const [roundType, setRoundType] = useState<GradingRoundType>(
    suggested && suggested !== 'APPEAL' ? suggested : 'INITIAL',
  )
  const [deadline, setDeadline] = useState('')
  const teachersQuery = useAssignableTeachersQuery(search)
  const teachers = teachersQuery.data ?? []
  const roundMismatch = !isReassign && suggested != null && suggested !== roundType
  // Chốt chặn cuối: `roundMismatch` im lặng đúng lúc nguy hiểm nhất (bài đã chốt sổ thì
  // `suggested` là null nên không có vòng nào để so lệch). Đổi giáo viên không đi qua đây.
  const blockedReason = isReassign ? null : assignBlockedReason(resultStatus)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
      <div
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {isReassign ? 'Đổi giáo viên chấm' : 'Phân công giáo viên chấm'}
            </h2>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              Bài <b className="text-slate-700">#{resultCode}</b>
              {studentName ? ` · ${studentName}` : ''}
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {isReassign ? (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <Info className="mt-0.5 size-4.5 shrink-0 text-blue-700" />
              <span className="text-[12.5px] font-medium leading-relaxed text-blue-700">
                Đổi người chấm giữ nguyên <b>vòng chấm</b> và <b>hạn chấm</b> của phân công đang mở.
                Chỉ đổi được khi giáo viên cũ chưa nộp.
              </span>
            </div>
          ) : (
            <>
              {blockedReason ? (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <ShieldAlert className="mt-0.5 size-4.5 shrink-0 text-red-600" />
                  <span className="text-[12.5px] font-medium leading-relaxed text-red-700">
                    {blockedReason} Hệ thống sẽ từ chối mọi phân công cho bài này.
                  </span>
                </div>
              ) : null}
              <div className="text-[12.5px] font-bold text-slate-600">Vòng chấm</div>
              <div className="mt-2">
                <RoundTypePicker onChange={setRoundType} value={roundType} />
              </div>
              {roundMismatch ? (
                <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12px] font-medium leading-relaxed text-amber-800">
                  Bài này đang ở trạng thái phù hợp với vòng{' '}
                  <b>{getRoundTypeDisplay(suggested).label}</b>. Giao vòng khác sẽ bị hệ thống từ
                  chối.
                </p>
              ) : null}
              <DeadlineField
                hint="Bỏ trống nếu chưa cần đặt hạn — đặt sau vẫn được."
                id="assign-deadline"
                label="Hạn chấm"
                onChange={setDeadline}
                value={deadline}
              />
            </>
          )}

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-[13.5px] font-medium text-slate-700 outline-none focus:border-cyan-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm giáo viên theo tên…"
              type="search"
              value={search}
            />
          </div>

          <div className="mt-4">
            {teachersQuery.isLoading ? (
              <div className="py-10 text-center text-sm text-slate-400">Đang tải…</div>
            ) : teachers.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                Không tìm thấy giáo viên phù hợp.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {teachers.map((teacher) => (
                  <TeacherPickerCard
                    key={teacher.id}
                    onToggle={() => setPicked(teacher.id)}
                    selected={picked === teacher.id}
                    teacher={teacher}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-slate-200 px-6 py-5">
          <button
            className="h-11 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            Hủy
          </button>
          <button
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-600 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={picked == null || picked === currentTeacherId || isPending || blockedReason !== null}
            onClick={() =>
              picked &&
              onConfirm({
                deadlineAt: localDateTimeToIso(deadline),
                roundType,
                teacherId: picked,
              })
            }
            type="button"
          >
            <UserCheck className="size-4.5" />
            {isReassign ? 'Đổi giáo viên' : 'Phân công'}
          </button>
        </div>
      </div>
    </div>
  )
}
