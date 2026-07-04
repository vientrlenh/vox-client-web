import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileUp, Search, UserPlus } from 'lucide-react'
import { Pagination } from '@/shared/components/Pagination'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { examQueryKeys, useExamCandidatesQuery, useExamRoomsQuery } from '../api/useExamQueries'
import { useAddCandidateMutation } from '../api/useExamMutations'
import { getCandidateStatusDisplay } from '../types'

const PAGE_SIZE = 10

type CandidatesTabProps = {
  examId: string
}

export function CandidatesTab({ examId }: CandidatesTabProps) {
  const queryClient = useQueryClient()
  const candidatesQuery = useExamCandidatesQuery(examId)
  const roomsQuery = useExamRoomsQuery(examId)
  const addCandidateMutation = useAddCandidateMutation()
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [page, setPage] = useState(1)

  const candidates = useMemo(() => candidatesQuery.data ?? [], [candidatesQuery.data])
  const roomCodeById = useMemo(
    () => new Map((roomsQuery.data ?? []).map((room) => [room.id, room.code])),
    [roomsQuery.data],
  )
  const classOptions = useMemo(
    () => Array.from(new Set(candidates.map((candidate) => candidate.schoolClassName))),
    [candidates],
  )
  const filteredCandidates = useMemo(
    () =>
      candidates.filter((candidate) => {
        const keyword = search.trim().toLowerCase()
        const matchesKeyword =
          !keyword ||
          candidate.studentName.toLowerCase().includes(keyword) ||
          candidate.sbd.toLowerCase().includes(keyword)
        const matchesClass = classFilter === 'all' || candidate.schoolClassName === classFilter
        return matchesKeyword && matchesClass
      }),
    [candidates, classFilter, search],
  )
  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleCandidates = filteredCandidates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const assignedCount = candidates.filter((candidate) => candidate.roomId).length

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleClassFilterChange(value: string) {
    setClassFilter(value)
    setPage(1)
  }

  async function handleAddCandidate() {
    const studentName = window.prompt('Tên học sinh mới:')
    if (!studentName?.trim()) {
      return
    }
    await addCandidateMutation.mutateAsync({
      examId,
      payload: {
        schoolClassId: candidates[0]?.schoolClassId ?? 'class-11a',
        schoolClassName: candidates[0]?.schoolClassName ?? 'Lớp 11A',
        studentName: studentName.trim(),
      },
    })
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.candidates(examId) })
  }

  return (
    <div className="mt-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard icon={<UserPlus size={19} />} iconTone="indigo" label="Tổng thí sinh" value={candidates.length} />
        <StatCard icon={<UserPlus size={19} />} iconTone="emerald" label="Đã vào phòng" value={assignedCount} />
        <StatCard
          icon={<UserPlus size={19} />}
          iconTone="amber"
          label="Chưa xếp phòng"
          value={candidates.length - assignedCount}
        />
        <StatCard icon={<UserPlus size={19} />} iconTone="violet" label="Số lớp" value={classOptions.length} />
      </div>

      <div className="mt-3.5 rounded-2xl border border-slate-200 bg-white p-5.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-extrabold text-slate-900">Danh sách thí sinh</h3>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
              type="button"
            >
              <FileUp aria-hidden="true" className="size-4" />
              Nhập từ Excel
            </button>
            <button
              className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-4 text-[13px] font-semibold text-white transition hover:bg-indigo-700"
              onClick={handleAddCandidate}
              type="button"
            >
              <UserPlus aria-hidden="true" className="size-4" />
              Thêm thí sinh
            </button>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2.5">
          <div className="relative min-w-50 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9.5 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-[13px] text-slate-900 outline-none focus:border-indigo-400"
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Tìm theo tên hoặc SBD…"
              value={search}
            />
          </div>
          <select
            className="h-9.5 rounded-lg border border-slate-200 px-2.5 text-[13px] text-slate-900"
            onChange={(event) => handleClassFilterChange(event.target.value)}
            value={classFilter}
          >
            <option value="all">Tất cả lớp</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3.5 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[110px_1fr_90px_90px_120px] gap-2.5 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <span>SBD</span>
            <span>Họ tên</span>
            <span>Lớp</span>
            <span>Phòng</span>
            <span>Trạng thái</span>
          </div>
          {visibleCandidates.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400">Không tìm thấy thí sinh phù hợp.</div>
          ) : (
            visibleCandidates.map((candidate) => {
              const statusDisplay = getCandidateStatusDisplay(candidate.roomId ? candidate.status : undefined)
              return (
                <div
                  className="grid grid-cols-[110px_1fr_90px_90px_120px] items-center gap-2.5 border-t border-slate-100 px-4 py-2.5"
                  key={candidate.id}
                >
                  <span className="font-mono text-xs font-bold text-slate-900">{candidate.sbd}</span>
                  <span className="text-[13px] text-slate-900">{candidate.studentName}</span>
                  <span className="text-[13px] text-slate-500">{candidate.schoolClassName}</span>
                  <span className="text-[13px] text-slate-500">
                    {candidate.roomId ? roomCodeById.get(candidate.roomId) ?? '-' : '-'}
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
    </div>
  )
}
