import { useState } from 'react'
import { Scale, Search, UsersRound, X } from 'lucide-react'
import { useAssignableTeachersQuery } from '../api/useGradingQueries'
import { TeacherPickerCard } from './TeacherPickerCard'

type AutoAssignDialogProps = {
  examName?: string | null
  isPending?: boolean
  onCancel: () => void
  onConfirm: (teacherIds: string[]) => void
  unassignedCount: number
}

/**
 * Chọn nhóm giáo viên để BE chia đều bài chưa gán.
 *
 * <p>BE cân theo TẢI THẬT (số bài mỗi người đang giữ), không chia vòng tròn từ 0 —
 * nên chạy lại lần hai không dồn hết vào người đầu danh sách, và bài đã có người
 * chấm bị bỏ qua.
 */
export function AutoAssignDialog({
  examName,
  isPending,
  onCancel,
  onConfirm,
  unassignedCount,
}: AutoAssignDialogProps) {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const teachersQuery = useAssignableTeachersQuery(search)
  const teachers = teachersQuery.data ?? []

  function togglePick(id: string) {
    setPicked((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  const perTeacher = picked.length > 0 ? Math.floor(unassignedCount / picked.length) : 0
  const remainder = picked.length > 0 ? unassignedCount % picked.length : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
      <div
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Phân công tự động</h2>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              Chia đều <b className="text-slate-700">{unassignedCount} bài chưa gán</b>
              {examName ? ` của ${examName}` : ''} cho nhóm giáo viên được chọn.
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

        <div className="border-b border-slate-200 px-6 py-4">
          <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <Scale className="mt-0.5 size-4.5 shrink-0 text-blue-700" />
            <span className="text-[12.5px] font-medium leading-relaxed text-blue-700">
              Hệ thống cân theo <b>số bài mỗi người đang giữ</b>, không chia đều từ số 0 — người
              đang rảnh sẽ nhận nhiều hơn. Bài đã có người chấm được bỏ qua.
            </span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-[13.5px] font-medium text-slate-700 outline-none focus:border-cyan-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm giáo viên theo tên…"
              type="search"
              value={search}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
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
                  onToggle={() => togglePick(teacher.id)}
                  selected={picked.includes(teacher.id)}
                  teacher={teacher}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-5">
          {picked.length > 0 && unassignedCount > 0 ? (
            <p className="mb-3 text-center text-[12.5px] font-semibold text-slate-500">
              Ước tính mỗi giáo viên nhận <b className="text-slate-900">~{perTeacher} bài</b>
              {remainder > 0 ? ` (${remainder} người nhận thêm 1 bài)` : ''}
            </p>
          ) : null}
          <div className="flex gap-2.5">
            <button
              className="h-11 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              onClick={onCancel}
              type="button"
            >
              Hủy
            </button>
            <button
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-600 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={picked.length === 0 || isPending}
              onClick={() => onConfirm(picked)}
              type="button"
            >
              <UsersRound className="size-4.5" />
              Phân công {picked.length > 0 ? `cho ${picked.length} giáo viên` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
