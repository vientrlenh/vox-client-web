import { useMemo, useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import type { ClassUser } from '@/features/classes/types'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { ScheduleAssignment } from './schedule/useExamScheduleState'

type StudentsTabProps = {
  assignmentByStudentId: Record<string, ScheduleAssignment>
  hasSchoolClass: boolean
  isLoading: boolean
  students: ClassUser[]
}

/**
 * Room/paper columns are informational only — they mirror the Phân lịch (schedule) tab's local
 * prototype state, since there is no backend concept of exam-room assignment yet.
 */
export function StudentsTab({ assignmentByStudentId, hasSchoolClass, isLoading, students }: StudentsTabProps) {
  const [search, setSearch] = useState('')

  const visibleStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) {
      return students
    }
    return students.filter((student) => {
      const name = student.user?.fullName?.toLowerCase() ?? ''
      const email = student.user?.email?.toLowerCase() ?? ''
      return name.includes(keyword) || email.includes(keyword)
    })
  }, [search, students])

  if (!hasSchoolClass) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
        Kỳ thi này chưa gắn với lớp học nào nên chưa có danh sách thí sinh.
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Tổng thí sinh" value={students.length} />
        <StatTile
          label="Đã xếp phòng/ca"
          value={students.filter((student) => assignmentByStudentId[student.userId]?.sessionLabel).length}
        />
        <StatTile
          label="Chưa xếp phòng/ca"
          tone="warning"
          value={students.filter((student) => !assignmentByStudentId[student.userId]?.sessionLabel).length}
        />
        <StatTile label="Đã có mã đề" value={Object.keys(assignmentByStudentId).length} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-extrabold text-slate-900">Danh sách thí sinh</h3>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="h-9 w-64 rounded-lg border border-slate-200 pr-3 pl-9 text-sm font-medium text-slate-900 outline-none focus:border-indigo-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên hoặc email…"
              value={search}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[110px_1fr_120px_120px] gap-2.5 bg-slate-50 px-4 py-2.5 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
            <span>SBD</span>
            <span>Họ tên</span>
            <span>Ca / Phòng</span>
            <span>Mã đề</span>
          </div>
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm font-semibold text-slate-500">Đang tải danh sách…</div>
          ) : null}
          {!isLoading && visibleStudents.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm font-semibold text-slate-500">Không tìm thấy thí sinh phù hợp.</div>
          ) : null}
          {visibleStudents.map((student) => {
            const assignment = assignmentByStudentId[student.userId]
            return (
              <div className="grid grid-cols-[110px_1fr_120px_120px] items-center gap-2.5 border-t border-slate-100 px-4 py-2.5" key={student.id}>
                <span className="font-mono text-xs font-bold text-slate-900">{student.userId.slice(0, 8).toUpperCase()}</span>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{student.user?.fullName ?? '—'}</div>
                  <div className="text-xs font-medium text-slate-500">{student.user?.email ?? '—'}</div>
                </div>
                <span className="text-xs font-semibold text-slate-500">{assignment?.sessionLabel ?? 'Chưa xếp'}</span>
                {assignment?.paperCode ? (
                  <span
                    className="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: assignment.paperColor }}
                  >
                    {assignment.paperCode}
                  </span>
                ) : (
                  <StatusBadge label="Chưa có" tone="neutral" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <UserPlus size={14} />
        Cột "Ca / Phòng" và "Mã đề" phản ánh trạng thái tạm thời từ tab Phân lịch (chưa lưu vào hệ thống).
      </p>
    </div>
  )
}

function StatTile({ label, tone = 'neutral', value }: { label: string; tone?: 'neutral' | 'warning'; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-extrabold ${tone === 'warning' && value > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{value}</div>
    </div>
  )
}
