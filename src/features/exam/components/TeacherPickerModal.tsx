import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { useSchoolTeachersQuery } from '@/features/school-users/api/useSchoolTeachersQuery'
import type { SchoolUser } from '@/features/school-users/types'
import { getMemberRoleDisplay, type ExamMemberRole } from '../types'

type TeacherPickerModalProps = {
  excludeUserIds: string[]
  onClose: () => void
  onSelect: (teacher: SchoolUser, role: ExamMemberRole) => void
}

const PAGE_SIZE = 8
const ROLE_OPTIONS: ExamMemberRole[] = ['AUTHOR', 'CHAIR', 'REVIEWER']

export function TeacherPickerModal({ excludeUserIds, onClose, onSelect }: TeacherPickerModalProps) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [role, setRole] = useState<ExamMemberRole>('AUTHOR')
  const teachersQuery = useSchoolTeachersQuery(page, PAGE_SIZE, { search: keyword, status: 'ACTIVE' })

  const teachers = (teachersQuery.data?.content ?? []).filter(
    (teacher) => teacher.userId && !excludeUserIds.includes(teacher.userId),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="teacher-picker-title"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-black text-slate-900" id="teacher-picker-title">
            Thêm thành viên hội đồng
          </h2>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <p className="border-b border-slate-200 bg-amber-50 px-6 py-2.5 text-xs font-semibold text-amber-700">
          Chỉ hiện giáo viên đã kích hoạt tài khoản (đã đặt mật khẩu). Giáo viên vừa tạo cần đặt mật khẩu qua email trước khi
          xuất hiện ở đây.
        </p>

        <div className="grid gap-3 border-b border-slate-200 px-6 py-3.5 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(1)
              }}
              placeholder="Tìm giáo viên theo tên hoặc email…"
              value={keyword}
            />
          </div>
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400"
            onChange={(event) => setRole(event.target.value as ExamMemberRole)}
            value={role}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {getMemberRoleDisplay(option)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {teachersQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-slate-400">Đang tải danh sách giáo viên…</p>
          ) : teachers.length ? (
            <div className="grid gap-2.5 py-2">
              {teachers.map((teacher) => (
                <button
                  className="grid gap-0.5 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
                  key={teacher.id}
                  onClick={() => onSelect(teacher, role)}
                  type="button"
                >
                  <span className="text-sm font-bold text-slate-900">{teacher.user?.fullName ?? '-'}</span>
                  <span className="text-xs text-slate-500">{teacher.user?.email ?? '-'}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">Không tìm thấy giáo viên phù hợp.</p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 text-xs font-semibold text-slate-500">
          <span>{teachersQuery.data?.totalElements ?? 0} giáo viên</span>
          <div className="flex gap-2">
            <button
              className="h-8 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="h-8 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
              disabled={page >= (teachersQuery.data?.totalPages ?? 1)}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
