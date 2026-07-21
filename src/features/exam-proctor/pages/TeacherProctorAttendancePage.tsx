import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarClock, ClipboardCheck, UserRound } from 'lucide-react'
import {
  useFlagExamSessionMutation,
  useForceEndExamSessionMutation,
  useUnblockExamCandidateMutation,
  useUpdateExamCandidateStatusMutation,
} from '@/features/examCore/api/mutations'
import {
  examQueryKeys,
  useMyProctorScheduleCandidatesQuery,
  useMyProctorSchedulesQuery,
} from '@/features/examCore/api/queries'
import { formatDateTime, getCandidateStatusDisplay, type ProctorCandidateSummaryDto } from '@/features/examCore/types'
import { getAttemptStatusDisplay } from '@/features/exam-results/types'
import { toApiError } from '@/shared/api'
import { ActionMenuButton, type ActionMenuItem } from '@/shared/ui/ActionMenuButton'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'

const FLAG_REASON = 'Giám thị đánh dấu bài thi là nghi vấn để chờ xem xét.'
const FORCE_END_REASON = 'Giám thị yêu cầu tạm dừng bài thi để xem xét.'
const UNBLOCK_REASON = 'Giám thị dỡ cấm để học sinh tiếp tục bài thi đang dở.'

function isWithinAttendanceWindow(startDate?: string | null) {
  if (!startDate) {
    return false
  }

  const start = new Date(startDate).getTime()
  if (Number.isNaN(start)) {
    return false
  }

  const now = Date.now()
  return now >= start - 30 * 60 * 1000 && now <= start + 10 * 60 * 1000
}

function getDisabledReason(startDate?: string | null) {
  return isWithinAttendanceWindow(startDate)
    ? undefined
    : 'Chỉ được điểm danh trong khoảng từ 30 phút trước giờ thi đến 10 phút sau giờ bắt đầu.'
}

export function TeacherProctorAttendancePage() {
  const queryClient = useQueryClient()
  const schedulesQuery = useMyProctorSchedulesQuery()
  const schedules = schedulesQuery.data ?? []
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { confirm, dialog } = useConfirmationDialog()
  const updateCandidateStatusMutation = useUpdateExamCandidateStatusMutation()
  const flagExamSessionMutation = useFlagExamSessionMutation()
  const forceEndExamSessionMutation = useForceEndExamSessionMutation()
  const unblockExamCandidateMutation = useUnblockExamCandidateMutation()
  const activeScheduleId = selectedScheduleId ?? schedules[0]?.scheduleId ?? null
  const selectedSchedule = schedules.find((schedule) => schedule.scheduleId === activeScheduleId) ?? null
  const candidatesQuery = useMyProctorScheduleCandidatesQuery(activeScheduleId)
  const candidates = candidatesQuery.data ?? []

  const upcomingCount = useMemo(
    () => schedules.filter((schedule) => schedule.startDate && new Date(schedule.startDate).getTime() > Date.now()).length,
    [schedules],
  )

  async function invalidateAttendance() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.proctorSchedules() })
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.proctorCandidates(activeScheduleId) })
  }

  // Same moderation actions as CandidatesTab.tsx/MonitoringRoomPage.tsx (mục M.1/M.3) --
  // this is the only page a plain schedule-proctor (not an exam CHAIR/AUTHOR/REVIEWER) can
  // actually reach, so it needs its own copy of the flag/force-end/unblock buttons rather
  // than relying on those other pages, which require broader exam-management access.
  function getModerationActions(candidate: ProctorCandidateSummaryDto, candidateName: string): ActionMenuItem[] {
    const items: ActionMenuItem[] = []

    if (candidate.blockedAt) {
      items.push({
        id: `unblock-${candidate.candidateId}`,
        label: 'Dỡ cấm',
        onSelect: () => {
          void (async () => {
            if (
              !(await confirm({
                message: `Dỡ cấm thi cho ${candidateName}? Học sinh sẽ được phép quay lại làm tiếp bài thi đang dở nếu kỳ thi vẫn còn mở.`,
                title: 'Xác nhận dỡ cấm',
              }))
            ) {
              return
            }

            try {
              await unblockExamCandidateMutation.mutateAsync({ candidateId: candidate.candidateId, reason: UNBLOCK_REASON })
              await invalidateAttendance()
              setMessage(`Đã dỡ cấm cho ${candidateName}.`)
            } catch (error) {
              setErrorMessage(toApiError(error).message)
            }
          })()
        },
        tone: 'primary',
      })
      return items
    }

    if (!candidate.sessionId) {
      return items
    }

    if (['IN_PROGRESS', 'SUBMITTED', 'INTERRUPTED'].includes(candidate.sessionStatus ?? '')) {
      items.push({
        id: `flag-${candidate.candidateId}`,
        label: 'Đánh dấu nghi vấn',
        onSelect: () => {
          void (async () => {
            if (
              !(await confirm({
                message: `Đánh dấu bài thi của ${candidateName} là nghi vấn? Học sinh vẫn tiếp tục thi bình thường, kết quả sẽ được giữ lại chờ giáo viên xem xét sau khi chấm xong.`,
                title: 'Xác nhận đánh dấu nghi vấn',
              }))
            ) {
              return
            }

            try {
              await flagExamSessionMutation.mutateAsync({ reason: FLAG_REASON, sessionId: candidate.sessionId as string })
              await invalidateAttendance()
              setMessage(`Đã đánh dấu nghi vấn cho ${candidateName}.`)
            } catch (error) {
              setErrorMessage(toApiError(error).message)
            }
          })()
        },
        tone: 'warning',
      })
    }

    if (['IN_PROGRESS', 'INTERRUPTED'].includes(candidate.sessionStatus ?? '')) {
      items.push({
        id: `force-end-${candidate.candidateId}`,
        label: 'Buộc kết thúc',
        onSelect: () => {
          void (async () => {
            if (
              !(await confirm({
                message: `Tạm dừng bài thi của ${candidateName} để xem xét? Học sinh sẽ bị ngắt kết nối ngay và không vào lại được cho tới khi được dỡ cấm.`,
                title: 'Xác nhận buộc kết thúc',
              }))
            ) {
              return
            }

            try {
              await forceEndExamSessionMutation.mutateAsync({ reason: FORCE_END_REASON, sessionId: candidate.sessionId as string })
              await invalidateAttendance()
              setMessage(`Đã buộc kết thúc bài thi của ${candidateName}.`)
            } catch (error) {
              setErrorMessage(toApiError(error).message)
            }
          })()
        },
        tone: 'danger',
      })
    }

    return items
  }

  return (
    <section className="grid gap-6">
      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
      {dialog}

      <div>
        <p className="text-sm font-black uppercase text-cyan-700">Điểm danh giám thị</p>
        <h1 className="mt-2 text-3xl font-black tracking-0 text-slate-950">Ca thi được phân công</h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          Xem các ca thi bạn được gán và đánh dấu vắng mặt trong khung giờ cho phép.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<ClipboardCheck size={19} />} iconTone="indigo" label="Tổng ca được gán" value={schedules.length} />
        <StatCard icon={<CalendarClock size={19} />} iconTone="amber" label="Ca sắp tới" value={upcomingCount} />
        <StatCard icon={<UserRound size={19} />} iconTone="emerald" label="Ca đang chọn" value={selectedSchedule ? 1 : 0} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-extrabold text-slate-900">Danh sách ca thi</h2>
          <div className="mt-4 grid gap-3">
            {schedulesQuery.isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Đang tải danh sách ca thi...
              </div>
            ) : schedules.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                Bạn chưa được phân công ca thi nào.
              </div>
            ) : (
              schedules.map((schedule) => {
                const isActive = schedule.scheduleId === activeScheduleId
                return (
                  <button
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-cyan-400 bg-cyan-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    key={schedule.scheduleId}
                    onClick={() => setSelectedScheduleId(schedule.scheduleId)}
                    type="button"
                  >
                    <p className="text-sm font-bold text-slate-900">{schedule.examName ?? schedule.examId}</p>
                    <p className="mt-1 text-xs text-slate-500">{schedule.roomName ?? 'Chưa có phòng'} • {formatDateTime(schedule.startDate)}</p>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-extrabold text-slate-900">
            {selectedSchedule ? `${selectedSchedule.examName ?? selectedSchedule.examId} • ${selectedSchedule.roomName ?? 'Chưa có phòng'}` : 'Danh sách thí sinh'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {selectedSchedule ? `${formatDateTime(selectedSchedule.startDate)} - ${formatDateTime(selectedSchedule.endDate)}` : 'Chọn một ca thi để xem danh sách thí sinh.'}
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[1.2fr_140px_56px] gap-3 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <span>Thí sinh</span>
              <span>Điểm danh</span>
              <span>Bài thi</span>
              <span />
            </div>

            {!activeScheduleId ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">Chọn một ca thi để tiếp tục.</div>
            ) : candidatesQuery.isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Đang tải danh sách thí sinh...</div>
            ) : candidates.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">Ca thi này chưa có thí sinh.</div>
            ) : (
              candidates.map((candidate) => {
                const statusDisplay = candidate.blockedAt
                  ? { label: 'Đang chờ xem xét', tone: 'warning' as const }
                  : getCandidateStatusDisplay(candidate.status)
                const sessionStatusDisplay = candidate.sessionId ? getAttemptStatusDisplay(candidate.sessionStatus) : null
                const disabledReason = getDisabledReason(selectedSchedule?.startDate)
                const candidateName = candidate.studentName ?? candidate.studentEmail ?? candidate.studentId

                const actions: ActionMenuItem[] = [
                  {
                    disabled: Boolean(disabledReason) || candidate.status === 'ABSENT',
                    disabledReason: candidate.status === 'ABSENT' ? 'Thí sinh đã được đánh dấu vắng mặt.' : disabledReason,
                    id: `mark-absent-${candidate.candidateId}`,
                    label: 'Đánh dấu vắng mặt',
                    onSelect: () => {
                      void (async () => {
                        if (
                          !(await confirm({
                            message: `Đánh dấu ${candidateName} là vắng mặt?`,
                            title: 'Xác nhận điểm danh',
                          }))
                        ) {
                          return
                        }

                        try {
                          await updateCandidateStatusMutation.mutateAsync({ candidateId: candidate.candidateId, status: 'ABSENT' })
                          await invalidateAttendance()
                          setMessage('Đã cập nhật trạng thái vắng mặt.')
                        } catch (error) {
                          setErrorMessage(toApiError(error).message)
                        }
                      })()
                    },
                    tone: 'warning',
                  },
                  ...getModerationActions(candidate, candidateName),
                ]

                return (
                  <div
                    className="grid grid-cols-[1.2fr_130px_130px_56px] items-center gap-3 border-t border-slate-100 px-4 py-3"
                    key={candidate.candidateId}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{candidateName}</p>
                      <p className="text-xs text-slate-500">{candidate.studentEmail ?? candidate.studentId}</p>
                    </div>
                    <span>
                      <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
                    </span>
                    <span>
                      {sessionStatusDisplay ? (
                        <StatusBadge label={sessionStatusDisplay.label} tone={sessionStatusDisplay.tone} />
                      ) : (
                        <span className="text-xs text-slate-400">Chưa vào thi</span>
                      )}
                    </span>
                    <span className="flex justify-end">
                      <ActionMenuButton ariaLabel={`Thao tác cho ${candidateName}`} items={actions} />
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
