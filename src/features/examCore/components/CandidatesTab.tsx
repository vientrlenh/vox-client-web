import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileUp, Search, UserPlus } from 'lucide-react'
import { toApiError } from '@/shared/api'
import { Pagination } from '@/shared/components/Pagination'
import { ActionMenuButton, type ActionMenuItem } from '@/shared/ui/ActionMenuButton'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import type { SchoolUser } from '@/features/school-users/types'
import { examResultQueryKeys } from '@/features/exam-results/api/useExamResultQueries'
import {
  useAddCandidateMutation,
  useFlagExamSessionMutation,
  useForceEndExamSessionMutation,
  useImportCandidatesByClassMutation,
  useImportCandidatesByGradeMutation,
  useUnblockExamCandidateMutation,
} from '../api/mutations'
import { examQueryKeys, useExamCandidatesQuery, useExamSchedulesQuery } from '../api/queries'
import {
  getCandidateName,
  getCandidateStatusDisplay,
  getScheduleLabel,
  type ExamAttemptSummaryDto,
  type ExamCandidateDto,
  type ExamPaperDto,
} from '../types'
import { ImportCandidatesModal } from './ImportCandidatesModal'
import { StudentPickerModal } from './StudentPickerModal'

const PAGE_SIZE = 10
const FLAG_REASON = 'Giám thị đánh dấu bài thi là nghi vấn để chờ xem xét.'
const FORCE_END_REASON = 'Giám thị yêu cầu tạm dừng bài thi để xem xét.'
const UNBLOCK_REASON = 'Giám thị dỡ cấm để học sinh tiếp tục bài thi đang dở.'

type CandidatesTabProps = {
  canManage: boolean
  examId: string
  papers: ExamPaperDto[]
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

export function CandidatesTab({ canManage, examId, papers }: CandidatesTabProps) {
  const queryClient = useQueryClient()
  const candidatesQuery = useExamCandidatesQuery(examId)
  const schedulesQuery = useExamSchedulesQuery(examId)
  const addCandidateMutation = useAddCandidateMutation()
  const importByClassMutation = useImportCandidatesByClassMutation()
  const importByGradeMutation = useImportCandidatesByGradeMutation()
  const flagExamSessionMutation = useFlagExamSessionMutation()
  const forceEndExamSessionMutation = useForceEndExamSessionMutation()
  const unblockExamCandidateMutation = useUnblockExamCandidateMutation()
  const { confirm, dialog } = useConfirmationDialog()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showStudentPicker, setShowStudentPicker] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  async function invalidateAll() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.candidates(examId) })
    await queryClient.invalidateQueries({ queryKey: examResultQueryKeys.all })
  }

  async function handleAddCandidate(student: SchoolUser) {
    if (!student.userId) {
      return
    }
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
      items.push({
        id: `flag-${candidate.id}`,
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
              await flagExamSessionMutation.mutateAsync({ reason: FLAG_REASON, sessionId: pendingSession.sessionId })
              await invalidateAll()
              setMessage(`Đã đánh dấu nghi vấn cho ${candidateName}.`)
            } catch (error) {
              setErrorMessage(toApiError(error).message)
            }
          })()
        },
        tone: 'warning',
      })
    }

    if (forceEndSession) {
      items.push({
        id: `force-end-${candidate.id}`,
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
              await forceEndExamSessionMutation.mutateAsync({ reason: FORCE_END_REASON, sessionId: forceEndSession.sessionId })
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

    return items
  }

  return (
    <div className="mt-4">
      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
      {dialog}

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard icon={<UserPlus size={19} />} iconTone="indigo" label="Tổng thí sinh" value={candidates.length} />
        <StatCard icon={<UserPlus size={19} />} iconTone="emerald" label="Đã vào ca" value={assignedCount} />
        <StatCard icon={<UserPlus size={19} />} iconTone="amber" label="Chưa xếp ca" value={candidates.length - assignedCount} />
        <StatCard icon={<UserPlus size={19} />} iconTone="violet" label="Đã phân đề" value={paperAssignedCount} />
      </div>

      <div className="mt-3.5 rounded-2xl border border-slate-200 bg-white p-5.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-extrabold text-slate-900">Danh sách thí sinh</h3>
          {canManage ? (
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
          <div className="grid grid-cols-[1fr_1fr_120px_140px_56px] gap-2.5 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
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
                  className="grid grid-cols-[1fr_1fr_120px_140px_56px] items-center gap-2.5 border-t border-slate-100 px-4 py-2.5"
                  key={candidate.id}
                >
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
                    <ActionMenuButton ariaLabel={`Thao tác cho ${getCandidateName(candidate)}`} items={actions} />
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

      {showStudentPicker ? (
        <StudentPickerModal
          excludeUserIds={candidates.map((candidate) => candidate.studentId)}
          onClose={() => setShowStudentPicker(false)}
          onSelect={(student) => void handleAddCandidate(student)}
        />
      ) : null}

      {showImportModal ? (
        <ImportCandidatesModal
          onClose={() => setShowImportModal(false)}
          onImportClass={(schoolClassId) => void handleImportClass(schoolClassId)}
          onImportGrade={(schoolGradeId) => void handleImportGrade(schoolGradeId)}
          submitting={importByClassMutation.isPending || importByGradeMutation.isPending}
        />
      ) : null}
    </div>
  )
}
