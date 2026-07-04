import { useMemo, useState } from 'react'
import { Check, RefreshCw, Search, Sparkles } from 'lucide-react'
import { Pagination } from '@/shared/components/Pagination'
import { useApplyPaperAssignmentsMutation } from '../../api/useExamMutations'
import type { ExamCandidateDto, ExamPaperDto, ExamRoomDto } from '../../types'

const PAGE_SIZE = 8

const PAPER_COLORS = [
  { chip: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  { chip: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500' },
  { chip: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  { chip: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  { chip: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
]

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function computeAssignments(
  candidates: ExamCandidateDto[],
  paperIds: string[],
  byRoom: boolean,
  randomize: boolean,
): Map<string, string> {
  const result = new Map<string, string>()
  if (!paperIds.length) {
    return result
  }

  function assignList(list: ExamCandidateDto[]) {
    const ordered = randomize ? shuffle(list) : list
    const offset = randomize ? Math.floor(Math.random() * paperIds.length) : 0
    ordered.forEach((candidate, index) => {
      result.set(candidate.id, paperIds[(index + offset) % paperIds.length])
    })
  }

  if (byRoom) {
    const groups = new Map<string, ExamCandidateDto[]>()
    for (const candidate of candidates) {
      const key = candidate.roomId ?? ''
      const list = groups.get(key) ?? []
      list.push(candidate)
      groups.set(key, list)
    }
    groups.forEach(assignList)
  } else {
    assignList(candidates)
  }
  return result
}

type PaperAssignmentPanelProps = {
  candidates: ExamCandidateDto[]
  onApplied?: () => void
  papers: ExamPaperDto[]
  rooms: ExamRoomDto[]
}

export function PaperAssignmentPanel({ candidates, onApplied, papers, rooms }: PaperAssignmentPanelProps) {
  const lockedPapers = useMemo(() => papers.filter((paper) => paper.status === 'LOCKED'), [papers])
  const byRoom = rooms.length > 0
  const eligibleCandidates = useMemo(
    () => (byRoom ? candidates.filter((candidate) => candidate.roomId) : candidates),
    [byRoom, candidates],
  )
  const sortedCandidates = useMemo(
    () => [...eligibleCandidates].sort((a, b) => a.sbd.localeCompare(b.sbd)),
    [eligibleCandidates],
  )
  const paperIds = useMemo(() => lockedPapers.map((paper) => paper.id), [lockedPapers])
  const classOptions = useMemo(
    () => Array.from(new Set(sortedCandidates.map((candidate) => candidate.schoolClassName))),
    [sortedCandidates],
  )

  const [assignments, setAssignments] = useState<Map<string, string>>(() =>
    computeAssignments(sortedCandidates, paperIds, byRoom, false),
  )
  const [applied, setApplied] = useState(false)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [page, setPage] = useState(1)
  const applyMutation = useApplyPaperAssignmentsMutation()

  const filteredCandidates = useMemo(
    () =>
      sortedCandidates.filter((candidate) => {
        const keyword = search.trim().toLowerCase()
        const matchesKeyword =
          !keyword ||
          candidate.studentName.toLowerCase().includes(keyword) ||
          candidate.sbd.toLowerCase().includes(keyword)
        const matchesClass = classFilter === 'all' || candidate.schoolClassName === classFilter
        return matchesKeyword && matchesClass
      }),
    [classFilter, search, sortedCandidates],
  )
  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedCandidates = filteredCandidates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleClassFilterChange(value: string) {
    setClassFilter(value)
    setPage(1)
  }

  function handleShuffle() {
    setAssignments(computeAssignments(sortedCandidates, paperIds, byRoom, true))
    setApplied(false)
  }

  function handleCycle(candidateId: string) {
    setAssignments((current) => {
      const next = new Map(current)
      const currentPaperId = next.get(candidateId)
      const currentIndex = currentPaperId ? paperIds.indexOf(currentPaperId) : -1
      next.set(candidateId, paperIds[(currentIndex + 1) % paperIds.length])
      return next
    })
    setApplied(false)
  }

  async function handleApply() {
    const payload = Array.from(assignments.entries()).map(([candidateId, paperId]) => ({ candidateId, paperId }))
    await applyMutation.mutateAsync(payload)
    setApplied(true)
    onApplied?.()
  }

  if (lockedPapers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-[13px] text-slate-400">
        Cần khóa ít nhất một mã đề ở tab Đề thi trước khi phân đề.
      </div>
    )
  }

  if (sortedCandidates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-[13px] text-slate-400">
        {byRoom ? 'Chưa có học sinh nào được xếp vào phòng thi.' : 'Chưa có học sinh nào tham gia.'}
      </div>
    )
  }

  const counts = new Map<string, number>()
  assignments.forEach((paperId) => counts.set(paperId, (counts.get(paperId) ?? 0) + 1))

  const summaryColsClass =
    lockedPapers.length >= 4 ? 'sm:grid-cols-4' : lockedPapers.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
  const rowGridClass = byRoom ? 'grid-cols-[110px_1fr_100px_110px]' : 'grid-cols-[110px_1fr_110px]'

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="size-4.5 text-indigo-600" />
        <p className="text-[13px] font-bold text-slate-900">
          {byRoom
            ? 'Phân đều số lượng theo mã đề trong từng phòng'
            : 'Phân đều số lượng theo mã đề theo số học sinh'}
        </p>
      </div>

      <div className={['grid gap-3', summaryColsClass].join(' ')}>
        {lockedPapers.map((examPaper, index) => {
          const color = PAPER_COLORS[index % PAPER_COLORS.length]
          return (
            <div className="rounded-2xl border border-slate-200 bg-white p-4" key={examPaper.id}>
              <div className="flex items-center gap-2">
                <span className={['size-2.5 rounded-full', color.dot].join(' ')} />
                <span className="text-xs font-bold text-slate-500">{examPaper.code}</span>
              </div>
              <div className="mt-1.5 text-[22px] font-extrabold text-slate-900">
                {counts.get(examPaper.id) ?? 0} thí sinh
              </div>
            </div>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4.5 py-3.5">
          <p className="text-[13px] text-slate-500">
            {filteredCandidates.length}/{sortedCandidates.length} học sinh · bấm vào chip mã đề để chỉnh tay
          </p>
          <div className="flex gap-2">
            <button
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              onClick={handleShuffle}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="size-3.5" />
              Chạy lại
            </button>
            <button
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              disabled={applyMutation.isPending}
              onClick={() => void handleApply()}
              type="button"
            >
              <Check aria-hidden="true" className="size-3.5" />
              Áp dụng phân đề
            </button>
          </div>
        </div>

        {applied ? (
          <div className="border-b border-emerald-100 bg-emerald-50 px-4.5 py-2 text-xs font-semibold text-emerald-700">
            Đã áp dụng phân đề cho {assignments.size} học sinh.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2.5 border-b border-slate-200 px-4.5 py-3.5">
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

        <div
          className={[
            'grid gap-2.5 bg-slate-50 px-4.5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500',
            rowGridClass,
          ].join(' ')}
        >
          <span>SBD</span>
          <span>Họ tên</span>
          {byRoom ? <span>Phòng</span> : null}
          <span>Mã đề</span>
        </div>
        {pagedCandidates.length === 0 ? (
          <div className="px-4.5 py-6 text-center text-xs text-slate-400">Không tìm thấy học sinh phù hợp.</div>
        ) : (
          pagedCandidates.map((candidate) => {
            const paperId = assignments.get(candidate.id)
            const paperIndex = paperId ? paperIds.indexOf(paperId) : -1
            const candidatePaper = paperIndex >= 0 ? lockedPapers[paperIndex] : undefined
            const color = paperIndex >= 0 ? PAPER_COLORS[paperIndex % PAPER_COLORS.length] : undefined
            const room = rooms.find((item) => item.id === candidate.roomId)
            return (
              <div
                className={['items-center gap-2.5 border-t border-slate-100 px-4.5 py-2.5', 'grid', rowGridClass].join(
                  ' ',
                )}
                key={candidate.id}
              >
                <span className="font-mono text-xs font-bold text-slate-900">{candidate.sbd}</span>
                <span className="text-[13px] text-slate-900">{candidate.studentName}</span>
                {byRoom ? <span className="text-[13px] text-slate-500">{room?.code ?? '-'}</span> : null}
                <button
                  className={[
                    'inline-flex h-7 w-fit items-center justify-self-start gap-1 rounded-full px-2.5 text-xs font-bold transition hover:opacity-80',
                    color ? color.chip : 'bg-slate-100 text-slate-500',
                  ].join(' ')}
                  onClick={() => handleCycle(candidate.id)}
                  type="button"
                >
                  {candidatePaper ? candidatePaper.code : '-'}
                </button>
              </div>
            )
          })
        )}

        <Pagination
          currentPage={currentPage}
          itemName="học sinh"
          onPageChange={setPage}
          totalElements={filteredCandidates.length}
          totalPages={totalPages}
        />
      </div>
    </div>
  )
}
