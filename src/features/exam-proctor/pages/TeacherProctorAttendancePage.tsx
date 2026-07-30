import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarClock, CheckSquare, KeyRound, UserRound, Video } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import {
  useFlagExamSessionMutation,
  useForceEndExamSessionMutation,
  useGetExamScheduleOtpMutation,
  useUnblockExamCandidateMutation,
  useUpdateExamCandidatesAttendanceMutation,
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

function areIdSetsEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) {
    return false
  }
  for (const id of a) {
    if (!b.has(id)) {
      return false
    }
  }
  return true
}

function isWithinAttendanceWindow(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) {
    return false
  }

  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return false
  }

  const now = Date.now()
  return now >= start - 30 * 60 * 1000 && now <= end
}

function getDisabledReason(startDate?: string | null, endDate?: string | null) {
  return isWithinAttendanceWindow(startDate, endDate)
    ? undefined
    : 'Chỉ được điểm danh trong khoảng từ 30 phút trước giờ thi đến khi kết thúc ca thi.'
}

function isAttendanceToggleable(candidate: ProctorCandidateSummaryDto) {
  return !candidate.blockedAt && (candidate.status === 'ASSIGNED' || candidate.status === 'ATTENDED' || candidate.status === 'ABSENT')
}

function formatCountdown(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds)
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const remainingSeconds = String(seconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${remainingSeconds}`
}

export function TeacherProctorAttendancePage() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const isSchoolAdminView = location.pathname.startsWith('/school-admin')
  const schedulesQuery = useMyProctorSchedulesQuery()
  const schedules = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data])
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)
  const [selectedAttendedIds, setSelectedAttendedIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [otpState, setOtpState] = useState<{ expiresAtMs: number; otp: string } | null>(null)
  const [clockNow, setClockNow] = useState(() => Date.now())
  const { confirm, confirmWithReason, dialog } = useConfirmationDialog()

  const updateAttendanceMutation = useUpdateExamCandidatesAttendanceMutation()
  const getScheduleOtpMutation = useGetExamScheduleOtpMutation()
  const flagExamSessionMutation = useFlagExamSessionMutation()
  const forceEndExamSessionMutation = useForceEndExamSessionMutation()
  const unblockExamCandidateMutation = useUnblockExamCandidateMutation()

  const activeScheduleId = selectedScheduleId ?? schedules[0]?.scheduleId ?? null
  const selectedSchedule = schedules.find((schedule) => schedule.scheduleId === activeScheduleId) ?? null
  const candidatesQuery = useMyProctorScheduleCandidatesQuery(activeScheduleId)
  const candidates = useMemo(() => candidatesQuery.data ?? [], [candidatesQuery.data])

  useEffect(() => {
    const timerId = window.setInterval(() => setClockNow(Date.now()), 1000)
    return () => window.clearInterval(timerId)
  }, [])

  useEffect(() => {
    const attendedIds = new Set(
      candidates.filter((candidate) => candidate.status === 'ATTENDED').map((candidate) => candidate.candidateId),
    )
    setSelectedAttendedIds((previous) => (areIdSetsEqual(previous, attendedIds) ? previous : attendedIds))
  }, [candidates, activeScheduleId])

  useEffect(() => {
    if (otpState && otpState.expiresAtMs <= clockNow) {
      setOtpState(null)
    }
  }, [clockNow, otpState])

  const attendanceDisabledReason = getDisabledReason(selectedSchedule?.startDate, selectedSchedule?.endDate)
  const upcomingCount = useMemo(
    () => schedules.filter((schedule) => schedule.startDate && new Date(schedule.startDate).getTime() > Date.now()).length,
    [schedules],
  )
  const absentCount = Math.max(0, candidates.length - selectedAttendedIds.size)
  const attendanceChanged = useMemo(
    () => candidates.some((candidate) => (candidate.status === 'ATTENDED') !== selectedAttendedIds.has(candidate.candidateId)),
    [candidates, selectedAttendedIds],
  )
  const otpSecondsRemaining = otpState ? Math.max(0, Math.ceil((otpState.expiresAtMs - clockNow) / 1000)) : 0

  async function invalidateAttendance() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.proctorSchedules() })
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.proctorCandidates(activeScheduleId) })
  }

  async function handleSaveAttendance() {
    if (!activeScheduleId) {
      return
    }

    if (
      !(await confirm({
        message: `Lưu điểm danh cho ca thi này? Hệ thống sẽ đánh dấu ${selectedAttendedIds.size} thí sinh có mặt và ${absentCount} thí sinh vắng mặt.`,
        title: 'Xác nhận lưu điểm danh',
      }))
    ) {
      return
    }

    const absentIds = candidates
      .filter((candidate) => !selectedAttendedIds.has(candidate.candidateId))
      .map((candidate) => candidate.candidateId)

    try {
      await updateAttendanceMutation.mutateAsync({
        candidateIds: absentIds,
        scheduleId: activeScheduleId,
      })
      await invalidateAttendance()
      setMessage('Đã lưu điểm danh thành công.')
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleFetchOtp() {
    if (!selectedSchedule) {
      return
    }

    try {
      const data = await getScheduleOtpMutation.mutateAsync({
        examId: selectedSchedule.examId,
        scheduleId: selectedSchedule.scheduleId,
      })
      setOtpState({
        expiresAtMs: Date.now() + Math.max(0, data.expiresSeconds) * 1000,
        otp: data.otp,
      })
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  function toggleAttended(candidateId: string, checked: boolean) {
    setSelectedAttendedIds((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(candidateId)
      } else {
        next.delete(candidateId)
      }
      return next
    })
  }

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
      items.push(
        candidate.sessionFlagged
          ? {
              id: `unflag-${candidate.candidateId}`,
              label: 'Bỏ đánh dấu nghi vấn',
              onSelect: () => {
                void (async () => {
                  if (
                    !(await confirm({
                      message: `Bỏ đánh dấu nghi vấn cho bài thi của ${candidateName}?`,
                      title: 'Xác nhận bỏ đánh dấu nghi vấn',
                    }))
                  ) {
                    return
                  }

                  try {
                    await flagExamSessionMutation.mutateAsync({
                      flagged: false,
                      sessionId: candidate.sessionId ?? '',
                    })
                    await invalidateAttendance()
                    setMessage(`Đã bỏ đánh dấu nghi vấn cho ${candidateName}.`)
                  } catch (error) {
                    setErrorMessage(toApiError(error).message)
                  }
                })()
              },
              tone: 'primary',
            }
          : {
              id: `flag-${candidate.candidateId}`,
              label: 'Đánh dấu nghi vấn',
              onSelect: () => {
                void (async () => {
                  const result = await confirmWithReason({
                    message: `Đánh dấu bài thi của ${candidateName} là nghi vấn? Học sinh vẫn tiếp tục thi bình thường, kết quả sẽ được giữ lại chờ giáo viên xem xét sau khi chấm xong.`,
                    reasonLabel: 'Lý do đánh dấu nghi vấn',
                    reasonPlaceholder: 'Nhập lý do nếu cần...',
                    title: 'Xác nhận đánh dấu nghi vấn',
                  })
                  if (!result.confirmed) {
                    return
                  }

                  try {
                    await flagExamSessionMutation.mutateAsync({
                      flagged: true,
                      reason: result.reason || FLAG_REASON,
                      sessionId: candidate.sessionId ?? '',
                    })
                    await invalidateAttendance()
                    setMessage(`Đã đánh dấu nghi vấn cho ${candidateName}.`)
                  } catch (error) {
                    setErrorMessage(toApiError(error).message)
                  }
                })()
              },
              tone: 'warning',
            },
      )
    }

    if (['IN_PROGRESS', 'INTERRUPTED'].includes(candidate.sessionStatus ?? '')) {
      items.push({
        id: `force-end-${candidate.candidateId}`,
        label: 'Buộc kết thúc',
        onSelect: () => {
          void (async () => {
            const result = await confirmWithReason({
              message: `Tạm dừng bài thi của ${candidateName} để xem xét? Học sinh sẽ bị ngắt kết nối ngay và không vào lại được cho tới khi được dỡ cấm.`,
              reasonLabel: 'Lý do buộc kết thúc',
              reasonPlaceholder: 'Nhập lý do nếu cần...',
              title: 'Xác nhận buộc kết thúc',
            })
            if (!result.confirmed) {
              return
            }

            try {
              await forceEndExamSessionMutation.mutateAsync({
                reason: result.reason || FORCE_END_REASON,
                sessionId: candidate.sessionId ?? '',
              })
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
          Chọn ca thi, tick vắng mặt theo danh sách rồi lưu một lần. Bạn cũng có thể lấy OTP hiện tại và xử lý các
          tình huống nghi vấn ngay trên cùng màn hình.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={<CheckSquare size={19} />} iconTone="indigo" label="Tổng ca được gán" value={schedules.length} />
        <StatCard icon={<CalendarClock size={19} />} iconTone="amber" label="Ca sắp tới" value={upcomingCount} />
        <StatCard icon={<UserRound size={19} />} iconTone="emerald" label="Ca đang chọn" value={selectedSchedule ? 1 : 0} />
        <StatCard icon={<UserRound size={19} />} iconTone="amber" label="Đang tick vắng mặt" value={absentCount} />
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
                    onClick={() => {
                      setSelectedScheduleId(schedule.scheduleId)
                      setOtpState(null)
                    }}
                    type="button"
                  >
                    <p className="text-sm font-bold text-slate-900">{schedule.examName ?? schedule.examId}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {schedule.roomName ?? 'Chưa có phòng'} • {formatDateTime(schedule.startDate)}
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-extrabold text-slate-900">
                {selectedSchedule
                  ? `${selectedSchedule.examName ?? selectedSchedule.examId} • ${selectedSchedule.roomName ?? 'Chưa có phòng'}`
                  : 'Danh sách thí sinh'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedSchedule
                  ? `${formatDateTime(selectedSchedule.startDate)} - ${formatDateTime(selectedSchedule.endDate)}`
                  : 'Chọn một ca thi để xem danh sách thí sinh.'}
              </p>
              {selectedSchedule?.schoolRoomId ? (
                <Link
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
                  to={
                    isSchoolAdminView
                      ? `/school-admin/monitoring/exams/${selectedSchedule.examId}/rooms/${selectedSchedule.schoolRoomId}`
                      : `/teacher/monitoring/exams/${selectedSchedule.examId}/rooms/${selectedSchedule.schoolRoomId}`
                  }
                >
                  <Video aria-hidden="true" className="size-4" />
                  Xem chi tiết
                </Link>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-cyan-600 px-4 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={
                    !activeScheduleId ||
                    Boolean(attendanceDisabledReason) ||
                    !attendanceChanged ||
                    updateAttendanceMutation.isPending
                  }
                  onClick={() => void handleSaveAttendance()}
                  type="button"
                >
                  {updateAttendanceMutation.isPending ? 'Đang lưu...' : 'Lưu điểm danh'}
                </button>
                {attendanceDisabledReason ? (
                  <span className="text-xs font-medium text-amber-700">{attendanceDisabledReason}</span>
                ) : attendanceChanged ? (
                  <span className="text-xs font-medium text-cyan-700">Có thay đổi chưa lưu.</span>
                ) : (
                  <span className="text-xs font-medium text-slate-500">Danh sách điểm danh đã đồng bộ.</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase text-cyan-700">OTP ca thi</p>
                  <h3 className="mt-2 text-lg font-extrabold text-slate-900">Tạo/Xem mã OTP</h3>
                </div>
                <KeyRound className="size-5 text-cyan-700" />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Nếu OTP vẫn còn hạn, hệ thống sẽ trả lại đúng mã hiện tại. Khi hết hạn, bấm lại để lấy mã mới.
              </p>
              <button
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!selectedSchedule || getScheduleOtpMutation.isPending}
                onClick={() => void handleFetchOtp()}
                type="button"
              >
                {getScheduleOtpMutation.isPending ? 'Đang lấy mã...' : otpState ? 'Xem lại mã OTP' : 'Tạo mã OTP'}
              </button>

              {otpState && otpSecondsRemaining > 0 ? (
                <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-cyan-700">Mã hiện tại</p>
                  <p className="mt-2 text-4xl font-black tracking-[0.2em] text-slate-950">{otpState.otp}</p>
                  <p className="mt-2 text-sm font-semibold text-cyan-800">
                    Còn hiệu lực: {formatCountdown(otpSecondsRemaining)}
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  {selectedSchedule ? 'Chưa có OTP đang hiển thị hoặc mã đã hết hạn.' : 'Chọn một ca thi để lấy OTP.'}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[1.2fr_150px_150px_56px] gap-3 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <span>Thí sinh</span>
                <span>Có mặt</span>
                <span>Phiên thi</span>
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
                  const candidateName = candidate.studentName ?? candidate.studentEmail ?? candidate.studentId
                  const canToggleAttendance = isAttendanceToggleable(candidate)
                  const checkboxDisabledReason = candidate.blockedAt
                    ? 'Thí sinh đang bị buộc kết thúc/chờ xem xét.'
                    : !canToggleAttendance
                      ? 'Chỉ có thể điểm danh các trạng thái Chưa điểm danh, Đã có mặt hoặc Vắng thi.'
                      : attendanceDisabledReason
                  const checked = selectedAttendedIds.has(candidate.candidateId)
                  const actions = getModerationActions(candidate, candidateName)

                  return (
                    <div
                      className="grid grid-cols-[1.2fr_150px_150px_56px] items-center gap-3 border-t border-slate-100 px-4 py-3"
                      key={candidate.candidateId}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{candidateName}</p>
                        <p className="text-xs text-slate-500">{candidate.studentEmail ?? candidate.studentId}</p>
                        <div className="mt-2">
                          <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
                        </div>
                      </div>

                      <div>
                        <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                          <input
                            checked={checked}
                            className="size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            disabled={Boolean(checkboxDisabledReason)}
                            onChange={(event) => toggleAttended(candidate.candidateId, event.target.checked)}
                            type="checkbox"
                          />
                          <span>Có mặt</span>
                        </label>
                        {checkboxDisabledReason ? (
                          <p className="mt-1 text-xs text-slate-400">{checkboxDisabledReason}</p>
                        ) : null}
                      </div>

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
      </div>
    </section>
  )
}
