import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarClock, FileUp, Lock, Search, UserPlus } from 'lucide-react'
import { toApiError } from '@/shared/api'
import { Pagination } from '@/shared/components/Pagination'
import { ActionMenuButton, type ActionMenuItem } from '@/shared/ui/ActionMenuButton'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { WarningBanner } from '@/shared/ui/WarningBanner'
import { examResultQueryKeys } from '@/features/exam-results/api/useExamResultQueries'
import type { ExamDirectoryUser } from '../api/examDirectoryQueries'
import {
  useAddCandidateMutation,
  useAssignCandidateScheduleMutation,
  useBulkAssignCandidateScheduleMutation,
  useFlagExamSessionMutation,
  useForceEndExamSessionMutation,
  useImportCandidatesByClassMutation,
  useImportCandidatesByGradeMutation,
  useRemoveExamCandidateMutation,
  useUnblockExamCandidateMutation,
} from '../api/mutations'
import { examQueryKeys, useExamCandidatesQuery, useExamSchedulesQuery } from '../api/queries'
import {
  getCandidateName,
  getCandidateStatusDisplay,
  getScheduleLabel,
  type ExamAttemptSummaryDto,
  type ExamCandidateDto,
  type ExamKind,
  type ExamPaperDto,
} from '../types'
import { AssignScheduleModal } from './AssignScheduleModal'
import { ImportCandidatesModal } from './ImportCandidatesModal'
import { StudentPickerModal } from './StudentPickerModal'

const PAGE_SIZE = 10
const FLAG_REASON = 'Giám thị đánh dấu bài thi là nghi vấn để chờ xem xét.'
const UNBLOCK_REASON = 'Giám thị dỡ cấm để học sinh tiếp tục bài thi đang dở.'

type CandidatesTabProps = {
  canManage: boolean
  examId: string
  /** Quyết định có lối nhập theo niên khóa hay không — xem `ImportCandidatesModal`. */
  examKind: ExamKind
  // Kỳ thi đã bắt đầu (IN_PROGRESS trở lên): backend khoá mọi thao tác sửa danh sách thí sinh
  // (ExamEditingGuard.requireScheduleEditable), nên ẩn nút trước thay vì để bấm rồi ăn lỗi.
  // Thao tác giám thị bên dưới vẫn mở vì đó là việc phải làm TRONG lúc thi.
  locked?: boolean
  papers: ExamPaperDto[]
  // Cảnh báo chủ động hạn mức token (chỉ bài trên lớp truyền xuống — ClassTestPages tính sẵn
  // dựa trên số thí sinh HIỆN TẠI). null/undefined = không hiển thị (kỳ thi tập trung không có
  // khái niệm hạn mức này, xem ClassTestTokenQuotaGuardService phía BE).
  quotaWarning?: string | null
}

function getLatestAttemptByStatuses(
  candidate: ExamCandidateDto,
  statuses: string[],
): ExamAttemptSummaryDto | null {
  return (
    [...(candidate.attempts ?? [])]
      .filter((attempt) => statuses.includes(attempt.status))
      .sort((left, right) => {
        const leftTime = left.startedAt ? new Date(left.startedAt).getTime() : 0
        const rightTime = right.startedAt ? new Date(right.startedAt).getTime() : 0
        return rightTime - leftTime
      })[0] ?? null
  )
}

function getCandidateBadge(candidate: ExamCandidateDto) {
  if (candidate.blockedAt) {
    return { label: 'Đang chờ xem xét', tone: 'warning' as const }
  }

  return getCandidateStatusDisplay(candidate.scheduleId ? candidate.status : undefined)
}

export function CandidatesTab({ canManage, examId, examKind, locked = false, papers, quotaWarning }: CandidatesTabProps) {
  const queryClient = useQueryClient()
  const candidatesQuery = useExamCandidatesQuery(examId)
  const schedulesQuery = useExamSchedulesQuery(examId)
  const addCandidateMutation = useAddCandidateMutation()
  const importByClassMutation = useImportCandidatesByClassMutation()
  const importByGradeMutation = useImportCandidatesByGradeMutation()
  const flagExamSessionMutation = useFlagExamSessionMutation()
  const forceEndExamSessionMutation = useForceEndExamSessionMutation()
  const unblockExamCandidateMutation = useUnblockExamCandidateMutation()
  const assignCandidateScheduleMutation = useAssignCandidateScheduleMutation()
  const bulkAssignCandidateScheduleMutation = useBulkAssignCandidateScheduleMutation()
  const removeCandidateMutation = useRemoveExamCandidateMutation()
  const { confirm, confirmWithReason, dialog } = useConfirmationDialog()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showStudentPicker, setShowStudentPicker] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [assigningCandidate, setAssigningCandidate] = useState<ExamCandidateDto | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Quyền sửa danh sách thí sinh = quyền quản lý + kỳ thi chưa bắt đầu.
  const canEditRoster = canManage && !locked
  const candidates = useMemo(() => candidatesQuery.data ?? [], [candidatesQuery.data])
  const scheduleLabelById = useMemo(
    () => new Map((schedulesQuery.data ?? []).map((schedule) => [schedule.id, getScheduleLabel(schedule)])),
    [schedulesQuery.data],
  )
  const paperCodeById = useMemo(() => new Map(papers.map((paper) => [paper.id, paper.code])), [papers])
  const filteredCandidates = useMemo(
    () =>
      candidates.filter((candidate) => {
        const keyword = search.trim().toLowerCase()
        if (!keyword) {
          return true
        }
        return (
          getCandidateName(candidate).toLowerCase().includes(keyword) ||
          (candidate.student?.email ?? '').toLowerCase().includes(keyword)
        )
      }),
    [candidates, search],
  )
  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleCandidates = filteredCandidates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const assignedCount = candidates.filter((candidate) => candidate.scheduleId).length
  const paperAssignedCount = candidates.filter((candidate) => candidate.assignedPaperId).length

  const visibleIds = visibleCandidates.map((candidate) => candidate.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function toggleSelected(candidateId: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(candidateId)) {
        next.delete(candidateId)
      } else {
        next.add(candidateId)
      }
      return next
    })
  }

  /** Chỉ đụng tới trang đang hiện — đổi trang/tìm kiếm không được âm thầm bỏ chọn ai. */
  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id))
      } else {
        visibleIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  async function invalidateAll() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.candidates(examId) })
    await queryClient.invalidateQueries({ queryKey: examResultQueryKeys.all })
  }

  async function handleAddCandidate(student: ExamDirectoryUser) {
    try {
      await addCandidateMutation.mutateAsync({ examId, payload: { studentId: student.userId } })
      await invalidateAll()
      setShowStudentPicker(false)
      setMessage('Đã thêm thí sinh.')
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleImportClass(schoolClassId: string) {
    try {
      const imported = await importByClassMutation.mutateAsync({ examId, payload: { schoolClassId } })
      await invalidateAll()
      setShowImportModal(false)
      setMessage(`Đã nhập ${imported.length} thí sinh từ lớp.`)
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleImportGrade(schoolGradeId: string) {
    try {
      const imported = await importByGradeMutation.mutateAsync({ examId, payload: { schoolGradeId } })
      await invalidateAll()
      setShowImportModal(false)
      setMessage(`Đã nhập ${imported.length} thí sinh từ khối.`)
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleAssignSchedule(scheduleId: string) {
    if (!assigningCandidate) {
      return
    }
    const candidateName = getCandidateName(assigningCandidate)
    try {
      await assignCandidateScheduleMutation.mutateAsync({ candidateId: assigningCandidate.id, examId, scheduleId })
      await invalidateAll()
      setAssigningCandidate(null)
      setMessage(`Đã xếp ca thi cho ${candidateName}.`)
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  /** Xếp/gỡ cả nhóm đang tick trong MỘT request — `null` là bỏ khỏi ca. */
  async function handleBulkAssignSchedule(scheduleId: string | null) {
    const candidateIds = Array.from(selectedIds)
    if (candidateIds.length === 0) {
      return
    }
    try {
      await bulkAssignCandidateScheduleMutation.mutateAsync({ candidateIds, examId, scheduleId })
      await invalidateAll()
      setSelectedIds(new Set())
      setShowBulkAssignModal(false)
      setMessage(
        scheduleId
          ? `Đã xếp ${candidateIds.length} thí sinh vào ca thi.`
          : `Đã bỏ ${candidateIds.length} thí sinh khỏi ca thi.`,
      )
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleUnassignSchedule(candidate: ExamCandidateDto) {
    const candidateName = getCandidateName(candidate)
    try {
      await assignCandidateScheduleMutation.mutateAsync({ candidateId: candidate.id, examId, scheduleId: null })
      await invalidateAll()
      setMessage(`Đã bỏ ${candidateName} khỏi ca thi.`)
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleRemoveCandidate(candidate: ExamCandidateDto) {
    const candidateName = getCandidateName(candidate)
    if (
      !(await confirm({
        message: `Xóa ${candidateName} khỏi kỳ thi? Học sinh sẽ không còn trong danh sách thí sinh và phải thêm lại nếu muốn dự thi.`,
        title: 'Xác nhận xóa thí sinh',
      }))
    ) {
      return
    }

    try {
      await removeCandidateMutation.mutateAsync({ candidateId: candidate.id, examId })
      await invalidateAll()
      setMessage(`Đã xóa ${candidateName} khỏi kỳ thi.`)
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  /** Nút "..." bị khóa trông y hệt nút hỏng — nói rõ lý do qua tooltip thay vì để người dùng đoán. */
  function getNoActionReason() {
    if (!canManage) {
      return 'Bạn không có quyền thao tác trên danh sách thí sinh của kỳ thi này'
    }
    if (locked) {
      return 'Kỳ thi đã bắt đầu — chỉ còn thao tác giám thị khi học sinh đang làm bài'
    }
    return 'Chưa có thao tác khả dụng cho học sinh này'
  }

  function getCandidateActions(candidate: ExamCandidateDto): ActionMenuItem[] {
    if (!canManage) {
      return []
    }

    const candidateName = getCandidateName(candidate)
    const pendingSession = getLatestAttemptByStatuses(candidate, ['IN_PROGRESS', 'SUBMITTED', 'INTERRUPTED'])
    const forceEndSession = getLatestAttemptByStatuses(candidate, ['IN_PROGRESS', 'INTERRUPTED'])
    const items: ActionMenuItem[] = []

    if (candidate.blockedAt) {
      items.push({
        id: `unblock-${candidate.id}`,
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
              await unblockExamCandidateMutation.mutateAsync({ candidateId: candidate.id, reason: UNBLOCK_REASON })
              await invalidateAll()
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

    if (pendingSession) {
      items.push(
        pendingSession.flagged
          ? {
              id: `unflag-${candidate.id}`,
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
                      sessionId: pendingSession.sessionId,
                    })
                    await invalidateAll()
                    setMessage(`Đã bỏ đánh dấu nghi vấn cho ${candidateName}.`)
                  } catch (error) {
                    setErrorMessage(toApiError(error).message)
                  }
                })()
              },
              tone: 'primary',
            }
          : {
              id: `flag-${candidate.id}`,
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
                      sessionId: pendingSession.sessionId,
                    })
                    await invalidateAll()
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

    if (forceEndSession) {
      items.push({
        id: `force-end-${candidate.id}`,
        label: 'Buộc kết thúc',
        onSelect: () => {
          void (async () => {
            const result = await confirmWithReason({
              message: `Tạm dừng bài thi của ${candidateName} để xem xét? Học sinh sẽ bị ngắt kết nối ngay và không vào lại được cho tới khi được dỡ cấm.`,
              reasonLabel: 'Lý do buộc kết thúc',
              reasonPlaceholder: 'Nhập lý do buộc kết thúc bài thi...',
              requireReason: true,
              title: 'Xác nhận buộc kết thúc',
            })
            if (!result.confirmed) {
              return
            }

            try {
              await forceEndExamSessionMutation.mutateAsync({
                reason: result.reason,
                sessionId: forceEndSession.sessionId,
              })
              await invalidateAll()
              setMessage(`Đã buộc kết thúc bài thi của ${candidateName}.`)
            } catch (error) {
              setErrorMessage(toApiError(error).message)
            }
          })()
        },
        tone: 'danger',
      })
    }

    // Thao tác sửa danh sách: backend chặn khi kỳ thi đã bắt đầu (ExamEditingGuard), và xoá thí sinh
    // đã có bài thi cũng bị chặn — nên chỉ mở khi thí sinh chưa từng vào thi.
    if (canEditRoster && (candidate.attempts?.length ?? 0) === 0) {
      items.push({
        id: `assign-schedule-${candidate.id}`,
        label: candidate.scheduleId ? 'Đổi ca thi' : 'Xếp ca thi',
        onSelect: () => setAssigningCandidate(candidate),
      })

      if (candidate.scheduleId) {
        items.push({
          id: `unassign-schedule-${candidate.id}`,
          label: 'Bỏ khỏi ca thi',
          onSelect: () => void handleUnassignSchedule(candidate),
        })
      }

      items.push({
        id: `remove-${candidate.id}`,
        label: 'Xóa khỏi kỳ thi',
        onSelect: () => void handleRemoveCandidate(candidate),
        tone: 'danger',
      })
    }

    return items
  }

  return (
    <div className="mt-4">
      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
      {dialog}

      {canManage && locked ? (
        <div className="mb-3.5 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">
          <Lock aria-hidden="true" className="size-4 shrink-0" />
          Bài kiểm tra đã bắt đầu — không thể thêm hoặc nhập thêm học sinh. Vẫn có thể đánh dấu nghi
          vấn, buộc kết thúc hoặc dỡ cấm.
        </div>
      ) : null}

      {canEditRoster ? <WarningBanner className="mb-3.5" message={quotaWarning ?? null} /> : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard icon={<UserPlus size={19} />} iconTone="indigo" label="Tổng thí sinh" value={candidates.length} />
        <StatCard icon={<UserPlus size={19} />} iconTone="emerald" label="Đã vào ca" value={assignedCount} />
        <StatCard icon={<UserPlus size={19} />} iconTone="amber" label="Chưa xếp ca" value={candidates.length - assignedCount} />
        <StatCard icon={<UserPlus size={19} />} iconTone="violet" label="Đã phân đề" value={paperAssignedCount} />
      </div>

      <div className="mt-3.5 rounded-2xl border border-slate-200 bg-white p-5.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-extrabold text-slate-900">Danh sách thí sinh</h3>
          {canEditRoster ? (
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setShowImportModal(true)}
                type="button"
              >
                <FileUp aria-hidden="true" className="size-4" />
                Nhập theo lớp/khối
              </button>
              <button
                className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-4 text-[13px] font-semibold text-white transition hover:bg-indigo-700"
                onClick={() => setShowStudentPicker(true)}
                type="button"
              >
                <UserPlus aria-hidden="true" className="size-4" />
                Thêm thí sinh
              </button>
            </div>
          ) : null}
        </div>

        {canEditRoster && selectedIds.size > 0 ? (
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5">
            <span className="text-xs font-semibold text-indigo-800">Đã chọn {selectedIds.size} thí sinh.</span>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-4 text-xs font-bold text-white transition hover:bg-indigo-700"
                onClick={() => setShowBulkAssignModal(true)}
                type="button"
              >
                <CalendarClock aria-hidden="true" className="size-3.5" />
                Xếp hàng loạt vào ca…
              </button>
              <button
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-red-200 bg-white px-4 text-xs font-bold text-red-600 transition hover:bg-red-50"
                onClick={() => void handleBulkAssignSchedule(null)}
                type="button"
              >
                Bỏ khỏi ca thi
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-3.5 flex flex-wrap gap-2.5">
          <div className="relative min-w-50 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9.5 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-[13px] text-slate-900 outline-none focus:border-indigo-400"
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              value={search}
            />
          </div>
        </div>

        <div className="mt-3.5 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[28px_1fr_1fr_120px_140px_56px] gap-2.5 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <span className="flex items-center">
              {canEditRoster && visibleCandidates.length > 0 ? (
                <input
                  aria-label="Chọn tất cả thí sinh trên trang này"
                  checked={allVisibleSelected}
                  className="size-3.5 accent-indigo-600"
                  onChange={toggleAllVisible}
                  type="checkbox"
                />
              ) : null}
            </span>
            <span>Họ tên</span>
            <span>Ca thi</span>
            <span>Mã đề</span>
            <span>Trạng thái</span>
            <span />
          </div>
          {visibleCandidates.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400">Không tìm thấy thí sinh phù hợp.</div>
          ) : (
            visibleCandidates.map((candidate) => {
              const statusDisplay = getCandidateBadge(candidate)
              const actions = getCandidateActions(candidate)

              return (
                <div
                  className="grid grid-cols-[28px_1fr_1fr_120px_140px_56px] items-center gap-2.5 border-t border-slate-100 px-4 py-2.5"
                  key={candidate.id}
                >
                  <span className="flex items-center">
                    {canEditRoster ? (
                      <input
                        aria-label={`Chọn ${getCandidateName(candidate)}`}
                        checked={selectedIds.has(candidate.id)}
                        className="size-3.5 accent-indigo-600"
                        onChange={() => toggleSelected(candidate.id)}
                        type="checkbox"
                      />
                    ) : null}
                  </span>
                  <span className="text-[13px] text-slate-900">{getCandidateName(candidate)}</span>
                  <span className="text-[13px] text-slate-500">
                    {candidate.scheduleId ? scheduleLabelById.get(candidate.scheduleId) ?? '-' : '-'}
                  </span>
                  <span className="text-[13px] font-semibold text-indigo-700">
                    {candidate.assignedPaperId ? paperCodeById.get(candidate.assignedPaperId) ?? '-' : '-'}
                  </span>
                  <span>
                    <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
                  </span>
                  <span className="flex justify-end">
                    <ActionMenuButton
                      ariaLabel={`Thao tác cho ${getCandidateName(candidate)}`}
                      items={actions}
                      title={actions.length === 0 ? getNoActionReason() : undefined}
                    />
                  </span>
                </div>
              )
            })
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          itemName="thí sinh"
          onPageChange={setPage}
          totalElements={filteredCandidates.length}
          totalPages={totalPages}
        />
      </div>

      {assigningCandidate ? (
        <AssignScheduleModal
          candidateName={getCandidateName(assigningCandidate)}
          currentScheduleId={assigningCandidate.scheduleId}
          onClose={() => setAssigningCandidate(null)}
          onSelect={(scheduleId) => void handleAssignSchedule(scheduleId)}
          schedules={schedulesQuery.data ?? []}
        />
      ) : null}

      {showBulkAssignModal ? (
        <AssignScheduleModal
          candidateName={`${selectedIds.size} thí sinh đã chọn`}
          onClose={() => setShowBulkAssignModal(false)}
          onSelect={(scheduleId) => void handleBulkAssignSchedule(scheduleId)}
          schedules={schedulesQuery.data ?? []}
        />
      ) : null}

      {showStudentPicker ? (
        <StudentPickerModal
          examId={examId}
          excludeUserIds={candidates.map((candidate) => candidate.studentId)}
          onClose={() => setShowStudentPicker(false)}
          onSelect={(student) => void handleAddCandidate(student)}
        />
      ) : null}

      {showImportModal ? (
        <ImportCandidatesModal
          examId={examId}
          examKind={examKind}
          onClose={() => setShowImportModal(false)}
          onImportClass={(schoolClassId) => void handleImportClass(schoolClassId)}
          onImportGrade={(schoolGradeId) => void handleImportGrade(schoolGradeId)}
          submitting={importByClassMutation.isPending || importByGradeMutation.isPending}
        />
      ) : null}
    </div>
  )
}
