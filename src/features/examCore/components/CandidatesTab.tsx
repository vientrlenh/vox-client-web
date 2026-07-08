import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileUp, Search, UserPlus } from 'lucide-react'
import { toApiError } from '@/shared/api'
import { Pagination } from '@/shared/components/Pagination'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { SchoolUser } from '@/features/school-users/types'
import { useAddCandidateMutation, useImportCandidatesByClassMutation, useImportCandidatesByGradeMutation } from '../api/mutations'
import { examQueryKeys, useExamCandidatesQuery, useExamSchedulesQuery } from '../api/queries'
import { getCandidateName, getCandidateStatusDisplay, getScheduleLabel, type ExamPaperDto } from '../types'
import { ImportCandidatesModal } from './ImportCandidatesModal'
import { StudentPickerModal } from './StudentPickerModal'

const PAGE_SIZE = 10

type CandidatesTabProps = {
  canManage: boolean
  examId: string
  papers: ExamPaperDto[]
}

export function CandidatesTab({ canManage, examId, papers }: CandidatesTabProps) {
  const queryClient = useQueryClient()
  const candidatesQuery = useExamCandidatesQuery(examId)
  const schedulesQuery = useExamSchedulesQuery(examId)
  const addCandidateMutation = useAddCandidateMutation()
  const importByClassMutation = useImportCandidatesByClassMutation()
  const importByGradeMutation = useImportCandidatesByGradeMutation()
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

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.candidates(examId) })
  }

  async function handleAddCandidate(student: SchoolUser) {
    if (!student.userId) {
      return
    }
    try {
      await addCandidateMutation.mutateAsync({ examId, payload: { studentId: student.userId } })
      await invalidate()
      setShowStudentPicker(false)
      setMessage('Đã thêm thí sinh.')
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleImportClass(schoolClassId: string) {
    try {
      const imported = await importByClassMutation.mutateAsync({ examId, payload: { schoolClassId } })
      await invalidate()
      setShowImportModal(false)
      setMessage(`Đã nhập ${imported.length} thí sinh từ lớp.`)
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleImportGrade(schoolGradeId: string) {
    try {
      const imported = await importByGradeMutation.mutateAsync({ examId, payload: { schoolGradeId } })
      await invalidate()
      setShowImportModal(false)
      setMessage(`Đã nhập ${imported.length} thí sinh từ khối.`)
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  return (
    <div className="mt-4">
      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard icon={<UserPlus size={19} />} iconTone="indigo" label="Tổng thí sinh" value={candidates.length} />
        <StatCard icon={<UserPlus size={19} />} iconTone="emerald" label="Đã vào ca" value={assignedCount} />
        <StatCard
          icon={<UserPlus size={19} />}
          iconTone="amber"
          label="Chưa xếp ca"
          value={candidates.length - assignedCount}
        />
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
              placeholder="Tìm theo tên hoặc email…"
              value={search}
            />
          </div>
        </div>

        <div className="mt-3.5 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[1fr_1fr_120px_120px] gap-2.5 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <span>Họ tên</span>
            <span>Ca thi</span>
            <span>Mã đề</span>
            <span>Trạng thái</span>
          </div>
          {visibleCandidates.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400">Không tìm thấy thí sinh phù hợp.</div>
          ) : (
            visibleCandidates.map((candidate) => {
              const statusDisplay = getCandidateStatusDisplay(candidate.scheduleId ? candidate.status : undefined)
              return (
                <div
                  className="grid grid-cols-[1fr_1fr_120px_120px] items-center gap-2.5 border-t border-slate-100 px-4 py-2.5"
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
