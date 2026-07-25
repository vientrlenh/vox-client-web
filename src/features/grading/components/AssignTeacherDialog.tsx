import { useState } from 'react'
import { Search, UserCheck, X } from 'lucide-react'
import { useAssignableTeachersQuery } from '../api/useGradingQueries'
import { TeacherPickerCard } from './TeacherPickerCard'

type AssignTeacherDialogProps = {
  currentTeacherId?: string | null
  isPending?: boolean
  onCancel: () => void
  onConfirm: (teacherId: string) => void
  resultCode: string
  studentName?: string | null
}

/**
 * Gán tay / đổi giáo viên cho MỘT bài. Chọn đúng một người — một bài chỉ có một
 * người chấm (BE enforce bằng unique index), nên đây là radio chứ không phải
 * checkbox như modal phân công tự động.
 */
export function AssignTeacherDialog({
  currentTeacherId,
  isPending,
  onCancel,
  onConfirm,
  resultCode,
  studentName,
}: AssignTeacherDialogProps) {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<string | null>(currentTeacherId ?? null)
  const teachersQuery = useAssignableTeachersQuery(search)
  const teachers = teachersQuery.data ?? []
  const isReassign = currentTeacherId != null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
      <div
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {isReassign ? 'Đổi giáo viên chấm' : 'Phân công giáo viên chấm'}
            </h2>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              Bài <b className="text-slate-700">#{resultCode}</b>
              {studentName ? ` · ${studentName}` : ''}
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
                  onToggle={() => setPicked(teacher.id)}
                  selected={picked === teacher.id}
                  teacher={teacher}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2.5 border-t border-slate-200 px-6 py-5">
          <button
            className="h-11 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            Hủy
          </button>
          <button
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-600 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={picked == null || picked === currentTeacherId || isPending}
            onClick={() => picked && onConfirm(picked)}
            type="button"
          >
            <UserCheck className="size-4.5" />
            {isReassign ? 'Đổi giáo viên' : 'Phân công'}
          </button>
        </div>
      </div>
    </div>
  )
}
