import { useMemo, useState } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import { getCandidateName, getScheduleLabel, type ExamCandidateDto, type ExamScheduleDto } from '../../types'

type AddStudentToRoomModalProps = {
  candidates: ExamCandidateDto[]
  /**
   * Học sinh nào đã có ca thi khác trùng giờ với ca này, kèm lý do hiển thị. Làm mờ chứ không lọc
   * bỏ: người dùng cần biết học sinh có tồn tại nhưng đang kẹt, và vì sao. Đây chỉ là lớp tiện
   * dụng — backend vẫn chặn khi submit.
   */
  conflictReasonByCandidateId?: Map<string, string>
  onAssign: (candidateIds: string[]) => void
  onClose: () => void
  /** Mọi ca của kỳ thi — để chọn nguồn khi muốn chuyển học sinh từ ca khác sang. */
  schedules: ExamScheduleDto[]
  schedule: ExamScheduleDto
  submitting?: boolean
}

/** `null` = nhóm chưa xếp ca; ngược lại là id của ca nguồn. */
type SourceScheduleId = string | null

export function AddStudentToRoomModal({
  candidates,
  conflictReasonByCandidateId,
  onAssign,
  onClose,
  schedule,
  schedules,
  submitting = false,
}: AddStudentToRoomModalProps) {
  const [keyword, setKeyword] = useState('')
  const [source, setSource] = useState<SourceScheduleId>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Ca khác của kỳ thi có người để chuyển sang — ca đang mở không nằm trong danh sách nguồn.
  const otherSchedules = useMemo(
    () =>
      schedules.filter(
        (item) => item.id !== schedule.id && candidates.some((candidate) => candidate.scheduleId === item.id),
      ),
    [candidates, schedule.id, schedules],
  )

  const pool = useMemo(
    () => candidates.filter((candidate) => (candidate.scheduleId ?? null) === source),
    [candidates, source],
  )

  const visible = useMemo(() => {
    const term = keyword.trim().toLowerCase()
    if (!term) {
      return pool
    }
    return pool.filter(
      (candidate) =>
        getCandidateName(candidate).toLowerCase().includes(term) ||
        (candidate.student?.email ?? '').toLowerCase().includes(term),
    )
  }, [keyword, pool])

  // Người trùng giờ bị loại khỏi "chọn tất cả": bấm một phát rồi gửi lên cả người backend sẽ chặn
  // sẽ làm hỏng nguyên lượt (xếp hàng loạt là all-or-nothing).
  const selectableIds = visible
    .filter((candidate) => !conflictReasonByCandidateId?.has(candidate.id))
    .map((candidate) => candidate.id)
  const allVisibleSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id))

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

  /** Chỉ đụng tới những dòng đang lọc — đổi từ khoá tìm kiếm không được âm thầm bỏ chọn ai. */
  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        selectableIds.forEach((id) => next.delete(id))
      } else {
        selectableIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  function changeSource(next: SourceScheduleId) {
    setSource(next)
    setKeyword('')
    // Bỏ chọn khi đổi nguồn: giữ lại thì bấm "Thêm" sẽ kéo theo cả người ở nhóm cũ mà không thấy.
    setSelectedIds(new Set())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="add-student-modal-title"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-900" id="add-student-modal-title">
              Thêm học sinh vào {getScheduleLabel(schedule)}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Ca này đang có {schedule.candidateCount} học sinh</p>
          </div>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-200 px-6 py-3.5">
          {otherSchedules.length > 0 ? (
            <label className="grid gap-1.5 text-xs font-bold text-slate-600">
              Lấy học sinh từ
              <select
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900 outline-none focus:border-indigo-400"
                onChange={(event) => changeSource(event.target.value === '' ? null : event.target.value)}
                value={source ?? ''}
              >
                <option value="">Học sinh chưa xếp ca</option>
                {otherSchedules.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getScheduleLabel(item)} ({item.candidateCount} học sinh)
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên hoặc email…"
              value={keyword}
            />
          </div>

          {selectableIds.length > 0 ? (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                checked={allVisibleSelected}
                className="size-4 accent-indigo-600"
                onChange={toggleAllVisible}
                type="checkbox"
              />
              Chọn tất cả {selectableIds.length} kết quả đang hiện
            </label>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              {source === null ? 'Không còn học sinh chưa xếp ca.' : 'Ca này không còn học sinh phù hợp.'}
            </p>
          ) : (
            <div className="grid gap-2 py-2">
              {visible.map((candidate) => {
                const conflictReason = conflictReasonByCandidateId?.get(candidate.id)

                return (
                  <label
                    className={[
                      'flex items-center gap-3 rounded-xl border p-3 transition',
                      conflictReason ? 'cursor-not-allowed border-slate-200 bg-slate-50' : 'cursor-pointer',
                      !conflictReason && selectedIds.has(candidate.id)
                        ? 'border-indigo-300 bg-indigo-50'
                        : conflictReason
                          ? ''
                          : 'border-slate-200 hover:bg-slate-50',
                    ].join(' ')}
                    key={candidate.id}
                    title={conflictReason}
                  >
                    <input
                      checked={selectedIds.has(candidate.id)}
                      className="size-4 shrink-0 accent-indigo-600"
                      disabled={Boolean(conflictReason)}
                      onChange={() => toggle(candidate.id)}
                      type="checkbox"
                    />
                    <div className="min-w-0">
                      <div
                        className={[
                          'truncate text-sm font-bold',
                          conflictReason ? 'text-slate-400' : 'text-slate-900',
                        ].join(' ')}
                      >
                        {getCandidateName(candidate)}
                      </div>
                      <div className="truncate text-xs text-slate-500">{candidate.student?.email ?? '-'}</div>
                      {conflictReason ? (
                        <div className="truncate text-xs font-semibold text-amber-600">{conflictReason}</div>
                      ) : null}
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <span className="text-xs font-semibold text-slate-500">Đã chọn {selectedIds.size} học sinh</span>
          <button
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={selectedIds.size === 0 || submitting}
            onClick={() => onAssign(Array.from(selectedIds))}
            type="button"
          >
            <UserPlus aria-hidden="true" className="size-4" />
            Thêm {selectedIds.size > 0 ? `${selectedIds.size} ` : ''}học sinh vào ca
          </button>
        </div>
      </section>
    </div>
  )
}
