import { useState } from 'react'
import { Check, Search, Sparkles, UserMinus, UserPlus, Wand2, X } from 'lucide-react'
import { Pagination } from '@/shared/components/Pagination'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import {
  formatDateTime,
  getCandidateName,
  getScheduleLabel,
  getScheduleStatusDisplay,
  type ExamCandidateDto,
  type ExamPaperDto,
  type ExamScheduleDto,
} from '../../types'
import { PAPER_COLORS } from './paperAssignment'

const PAGE_SIZE = 10
const GRID = 'grid-cols-[28px_1fr_1fr_150px_56px]'

type ScheduleSessionDetailProps = {
  candidates: ExamCandidateDto[]
  canEdit: boolean
  /** Số thí sinh của cả kỳ thi chưa được xếp vào ca nào — hết rồi thì ẩn nút "Tự động xếp". */
  hasUnassignedCandidates: boolean
  lockedPapers: ExamPaperDto[]
  onAddStudent: () => void
  onApplyPaperDraft: () => void
  onAssignPapersForSchedule: () => void
  onAutoFill: () => void
  onChangePaper: (candidateId: string, paperId: string) => void
  onPageChange: (page: number) => void
  onRemoveCandidate: (candidateId: string) => void
  /** Gỡ nhiều học sinh khỏi ca trong một request. */
  onRemoveCandidates: (candidateIds: string[]) => void
  onSearchChange: (value: string) => void
  page: number
  paperDraftCount: number
  /** Lý do không phân đề được (chưa khóa hết mã đề) — có thì các nút phân đề bị khóa kèm tooltip. */
  paperAssignmentBlockedReason?: string
  resolvePaperId: (candidate: ExamCandidateDto) => string | null
  schedule: ExamScheduleDto
  search: string
}

export function ScheduleSessionDetail({
  candidates,
  canEdit,
  hasUnassignedCandidates,
  lockedPapers,
  onAddStudent,
  onApplyPaperDraft,
  onAssignPapersForSchedule,
  onAutoFill,
  onChangePaper,
  onPageChange,
  onRemoveCandidate,
  onRemoveCandidates,
  onSearchChange,
  page,
  paperDraftCount,
  paperAssignmentBlockedReason,
  resolvePaperId,
  schedule,
  search,
}: ScheduleSessionDetailProps) {
  const keyword = search.trim().toLowerCase()
  const filtered = candidates.filter(
    (candidate) =>
      !keyword ||
      getCandidateName(candidate).toLowerCase().includes(keyword) ||
      (candidate.student?.email ?? '').toLowerCase().includes(keyword),
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const statusDisplay = getScheduleStatusDisplay(schedule.status)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Học sinh vừa bị gỡ/chuyển đi thì id cũ phải rời khỏi tập đang chọn, nếu không thanh hành động
  // vẫn đếm những người không còn trong ca.
  const selectedInSchedule = candidates.filter((candidate) => selectedIds.has(candidate.id))
  const visibleIds = visible.map((candidate) => candidate.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))

  function toggle(candidateId: string) {
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

  /** Chỉ đụng tới trang đang hiện — đổi trang không được âm thầm bỏ chọn người ở trang trước. */
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

  function removeSelected() {
    onRemoveCandidates(selectedInSchedule.map((candidate) => candidate.id))
    setSelectedIds(new Set())
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-[15px] font-extrabold text-slate-900">{getScheduleLabel(schedule)}</h3>
            <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
          </div>
          <div className="mt-1 text-[13px] text-slate-500">
            {formatDateTime(schedule.startDate)} – {formatDateTime(schedule.endDate)} · {candidates.length} học sinh ·{' '}
            {schedule.proctors.length}/{schedule.requiredProctorCount} giám thị
          </div>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            {hasUnassignedCandidates ? (
              <button
                className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={onAutoFill}
                type="button"
              >
                <Wand2 aria-hidden="true" className="size-4" />
                Tự động xếp
              </button>
            ) : null}
            <button
              className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={Boolean(paperAssignmentBlockedReason) || candidates.length === 0}
              onClick={onAssignPapersForSchedule}
              title={paperAssignmentBlockedReason}
              type="button"
            >
              <Sparkles aria-hidden="true" className="size-4" />
              Phân đề cho ca này
            </button>
            <button
              className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-4 text-[13px] font-semibold text-white transition hover:bg-indigo-700"
              onClick={onAddStudent}
              type="button"
            >
              <UserPlus aria-hidden="true" className="size-4" />
              Thêm học sinh vào ca
            </button>
          </div>
        ) : null}
      </div>

      {canEdit && paperDraftCount > 0 ? (
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
          <span className="text-xs font-semibold text-emerald-800">
            Đang có {paperDraftCount} thay đổi phân đề chưa lưu.
          </span>
          <button
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700"
            onClick={onApplyPaperDraft}
            type="button"
          >
            <Check aria-hidden="true" className="size-3.5" />
            Áp dụng phân đề
          </button>
        </div>
      ) : null}

      {canEdit && selectedInSchedule.length > 0 ? (
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5">
          <span className="text-xs font-semibold text-indigo-800">
            Đã chọn {selectedInSchedule.length} học sinh trong ca này.
          </span>
          <button
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-red-200 bg-white px-4 text-xs font-bold text-red-600 transition hover:bg-red-50"
            onClick={removeSelected}
            type="button"
          >
            <UserMinus aria-hidden="true" className="size-3.5" />
            Gỡ khỏi ca
          </button>
        </div>
      ) : null}

      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <div className="relative min-w-50 flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-9.5 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-[13px] text-slate-900 outline-none focus:border-indigo-400"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo tên hoặc email…"
            value={search}
          />
        </div>
      </div>

      <div className="mt-3.5 overflow-hidden rounded-xl border border-slate-200">
        <div
          className={[
            'grid gap-2.5 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500',
            GRID,
          ].join(' ')}
        >
          <span className="flex items-center">
            {canEdit && visible.length > 0 ? (
              <input
                aria-label="Chọn tất cả học sinh trên trang này"
                checked={allVisibleSelected}
                className="size-3.5 accent-indigo-600"
                onChange={toggleAllVisible}
                type="checkbox"
              />
            ) : null}
          </span>
          <span>Họ tên</span>
          <span>Email</span>
          <span>Mã đề</span>
          <span />
        </div>
        {visible.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            {candidates.length === 0 ? 'Chưa có học sinh nào trong ca này.' : 'Không tìm thấy học sinh phù hợp.'}
          </div>
        ) : (
          visible.map((candidate) => {
            const paperId = resolvePaperId(candidate)
            const paperIndex = paperId ? lockedPapers.findIndex((paper) => paper.id === paperId) : -1
            const color = paperIndex >= 0 ? PAPER_COLORS[paperIndex % PAPER_COLORS.length] : undefined
            return (
              <div className={['grid items-center gap-2.5 border-t border-slate-100 px-4 py-2.5', GRID].join(' ')} key={candidate.id}>
                <span className="flex items-center">
                  {canEdit ? (
                    <input
                      aria-label={`Chọn ${getCandidateName(candidate)}`}
                      checked={selectedIds.has(candidate.id)}
                      className="size-3.5 accent-indigo-600"
                      onChange={() => toggle(candidate.id)}
                      type="checkbox"
                    />
                  ) : null}
                </span>
                <span className="text-[13px] text-slate-900">{getCandidateName(candidate)}</span>
                <span className="truncate text-[13px] text-slate-500">{candidate.student?.email ?? '-'}</span>
                <div className="flex items-center gap-2">
                  <span className={['size-2.5 shrink-0 rounded-full', color ? color.dot : 'bg-slate-300'].join(' ')} />
                  {lockedPapers.length === 0 ? (
                    <span className="text-[13px] text-slate-400">-</span>
                  ) : (
                    <select
                      aria-label={`Mã đề của ${getCandidateName(candidate)}`}
                      className="h-8 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!canEdit}
                      onChange={(event) => onChangePaper(candidate.id, event.target.value)}
                      value={paperId ?? ''}
                    >
                      {/* Chỉ là chỗ giữ khi chưa gán — backend không có thao tác "gỡ mã đề" nên không cho chọn lại. */}
                      <option disabled value="">
                        Chưa gán
                      </option>
                      {lockedPapers.map((paper) => (
                        <option key={paper.id} value={paper.id}>
                          {paper.code}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <span className="flex justify-end">
                  {canEdit ? (
                    <button
                      aria-label={`Bỏ ${getCandidateName(candidate)} khỏi ca`}
                      className="inline-flex size-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
                      onClick={() => onRemoveCandidate(candidate.id)}
                      type="button"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  ) : null}
                </span>
              </div>
            )
          })
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        itemName="học sinh"
        onPageChange={onPageChange}
        totalElements={filtered.length}
        totalPages={totalPages}
      />
    </div>
  )
}
