import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Bot,
  CircleCheck,
  ClipboardList,
  Flag,
  Headphones,
  Inbox,
  Info,
  Mic,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRoundCog,
  UsersRound,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toApiError } from '@/shared/api'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { FilterChips } from '@/shared/ui/FilterChips'
import { PageLoader } from '@/shared/ui/PageLoader'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { TabPillGroup, type TabPillItem } from '@/shared/ui/TabPill'
import {
  useAssignGradingMutation,
  useAutoAssignGradingMutation,
  useInvalidateGradingByResultMutation,
  useInvalidateGradingMutation,
  useReassignGradingMutation,
  useRemoveGradingAssignmentMutation,
  useSubmitGradingByResultMutation,
  useSubmitGradingMutation,
  type ItemGradeInput,
} from '../api/useGradingMutations'
import { useGradingPreviewByResultQuery, useGradingPreviewQuery } from '../api/useGradingPreviewQuery'
import {
  useGradingAssignmentsQuery,
  useGradingExamOptionsQuery,
  useGradingStatsQuery,
  useGradingTaskDetailBySchoolQuery,
  useGradingTaskDetailQuery,
  useMyGradingTasksQuery,
} from '../api/useGradingQueries'
import { AssignTeacherDialog } from '../components/AssignTeacherDialog'
import { AutoAssignDialog } from '../components/AutoAssignDialog'
import { CriterionScoreCard } from '../components/CriterionScoreCard'
import { GradingTurnList } from '../components/GradingTurnList'
import { InvalidateDialog } from '../components/InvalidateDialog'
import { RemoveAssignmentDialog } from '../components/RemoveAssignmentDialog'
import { SubmitGradingDialog } from '../components/SubmitGradingDialog'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import {
  avatarClasses,
  formatIsoDateTime,
  formatScore,
  getAssignmentStatusDisplay,
  getResultStatusDisplay,
  initials,
  isEveryRequiredCriterionFilled,
  type GradingAssignmentRow,
  type GradingAssignmentStatus,
  type GradingTaskDetail,
  type GradingTaskItem,
} from '../types'

const PAGE_SIZE = 20
const PREVIEW_DEBOUNCE_MS = 500

// Màn admin chỉ liệt kê bài đang chờ chấm (PENDING_REVIEW) nên không có bài
// COMPLETED để lọc — bài chấm xong rời khỏi bảng. Filter COMPLETED chỉ có ở màn
// giáo viên (họ vẫn thấy việc đã hoàn thành của mình).
const ADMIN_STATUS_FILTERS: Array<{ label: string; value: '' | GradingAssignmentStatus }> = [
  { label: 'Tất cả', value: '' },
  { label: 'Đã phân công', value: 'ASSIGNED' },
]

const TEACHER_STATUS_FILTERS: Array<{ label: string; value: '' | GradingAssignmentStatus }> = [
  { label: 'Tất cả', value: '' },
  { label: 'Đang chờ chấm', value: 'ASSIGNED' },
  { label: 'Đã chấm xong', value: 'COMPLETED' },
]

function ResultCode({ code }: { code: string }) {
  return (
    <span className="inline-flex h-7 items-center rounded-lg bg-slate-100 px-2.5 font-mono text-[12.5px] font-bold tracking-wide text-slate-700">
      #{code}
    </span>
  )
}

function FlaggedChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-700">
      <Flag className="size-3" />
      Nghi vấn
    </span>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="mb-4.5 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-slate-500 transition hover:text-slate-700"
      onClick={onClick}
      type="button"
    >
      <ArrowLeft className="size-4.5" />
      Quay lại danh sách
    </button>
  )
}

/** Tab theo từng phần thi: value là paperItemId, nhãn lấy partLabel (thiếu thì "Phần N"). */
function itemTabItems(items: GradingTaskItem[]): TabPillItem[] {
  return items.map((item, index) => ({
    label: item.partLabel ?? `Phần ${index + 1}`,
    value: item.paperItemId,
  }))
}

// ============================= School Admin: Assignments =============================

export function SchoolAdminGradingPage() {
  const navigate = useNavigate()
  const [examId, setExamId] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | GradingAssignmentStatus>('')
  const [assignTarget, setAssignTarget] = useState<GradingAssignmentRow | null>(null)
  const [removeTarget, setRemoveTarget] = useState<GradingAssignmentRow | null>(null)
  const [autoAssignOpen, setAutoAssignOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const debouncedSearch = useDebouncedValue(search, 350)
  const assignmentsQuery = useGradingAssignmentsQuery(page, PAGE_SIZE, {
    examId,
    search: debouncedSearch,
    status,
  })
  const statsQuery = useGradingStatsQuery({ examId })
  const examOptionsQuery = useGradingExamOptionsQuery()

  const assignMutation = useAssignGradingMutation()
  const reassignMutation = useReassignGradingMutation()
  const removeMutation = useRemoveGradingAssignmentMutation()
  const autoAssignMutation = useAutoAssignGradingMutation()

  const pageData = assignmentsQuery.data
  const rows = pageData?.content ?? []
  const totalPages = pageData?.totalPages ?? 0
  const totalElements = pageData?.totalElements ?? 0
  const stats = statsQuery.data
  const selectedExamName = examOptionsQuery.data?.find((exam) => exam.id === examId)?.name

  function resetToFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function confirmAssign(teacherId: string) {
    const target = assignTarget
    if (!target) {
      return
    }
    // Cùng một modal cho gán mới và đổi người: có assignmentId thì là UPDATE dòng
    // sẵn có, chưa có thì mới tạo — một bài chỉ được có một người chấm.
    if (target.assignmentId) {
      reassignMutation.mutate(
        { assignmentId: target.assignmentId, teacherId },
        {
          onError: (error) => setMessage(toApiError(error).message),
          onSuccess: () => {
            setAssignTarget(null)
            setMessage(`Đã đổi giáo viên chấm bài #${target.resultCode}.`)
          },
        },
      )
      return
    }
    assignMutation.mutate([{ candidateResultId: target.candidateResultId, teacherId }], {
      onError: (error) => setMessage(toApiError(error).message),
      onSuccess: () => {
        setAssignTarget(null)
        setMessage(`Đã phân công chấm bài #${target.resultCode}.`)
      },
    })
  }

  function confirmRemove() {
    const target = removeTarget
    if (!target?.assignmentId) {
      return
    }
    removeMutation.mutate(target.assignmentId, {
      onError: (error) => {
        setRemoveTarget(null)
        setMessage(toApiError(error).message)
      },
      onSuccess: () => {
        setRemoveTarget(null)
        setMessage(`Đã gỡ phân công bài #${target.resultCode}.`)
      },
    })
  }

  function confirmAutoAssign(teacherIds: string[]) {
    autoAssignMutation.mutate(
      { examId, teacherIds },
      {
        onError: (error) => setMessage(toApiError(error).message),
        onSuccess: (result) => {
          setAutoAssignOpen(false)
          setMessage(
            result.data.length > 0
              ? `Đã phân công tự động ${result.data.length} bài.`
              : 'Không còn bài nào chưa phân công.',
          )
        },
      },
    )
  }

  return (
    <section className="mx-auto max-w-300">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-cyan-700">Chấm bài</p>
          <h1 className="mt-1.5 text-[30px] font-extrabold tracking-tight text-slate-900">
            Phân công chấm bài
          </h1>
          <p className="mt-1.5 max-w-xl text-[15px] text-slate-500">
            Giao bài đang chờ chấm cho giáo viên và theo dõi tiến độ. Bài đã công bố không nằm trong
            danh sách này.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13.5px] font-bold text-slate-600 transition hover:bg-slate-50"
            onClick={() => assignmentsQuery.refetch()}
            type="button"
          >
            <RefreshCw className="size-4" />
            Làm mới
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-cyan-600 px-4.5 text-[13.5px] font-bold text-white shadow-lg shadow-cyan-600/25 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            // BE bắt buộc phạm vi: phân công tự động luôn chạy trong một kỳ thi.
            disabled={!examId || (stats?.unassigned ?? 0) === 0}
            onClick={() => setAutoAssignOpen(true)}
            title={examId ? undefined : 'Chọn kỳ thi trước khi phân công tự động'}
            type="button"
          >
            <UsersRound className="size-4.5" />
            Phân công tự động
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Inbox size={19} />}
          iconTone="indigo"
          label="Tổng bài cần chấm"
          value={stats?.totalToGrade ?? '-'}
        />
        <StatCard
          icon={<UserPlus size={19} />}
          iconTone="amber"
          label="Chưa phân công"
          value={stats?.unassigned ?? '-'}
        />
        <StatCard
          icon={<ClipboardList size={19} />}
          iconTone="violet"
          label="Đã phân công"
          value={stats?.assigned ?? '-'}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          aria-label="Lọc theo kỳ thi"
          className="h-11 min-w-56 rounded-lg border border-slate-200 bg-white px-3.5 text-[13.5px] font-semibold text-slate-700 outline-none focus:border-cyan-400"
          onChange={(event) => resetToFirstPage(setExamId)(event.target.value)}
          value={examId}
        >
          <option value="">Tất cả kỳ thi</option>
          {(examOptionsQuery.data ?? []).map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name}
            </option>
          ))}
        </select>
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3.5 text-[13.5px] font-medium text-slate-700 outline-none focus:border-cyan-400"
            onChange={(event) => resetToFirstPage(setSearch)(event.target.value)}
            placeholder="Tìm theo mã bài hoặc tên giáo viên…"
            type="search"
            value={search}
          />
        </div>
      </div>

      <FilterChips items={ADMIN_STATUS_FILTERS} onChange={resetToFirstPage(setStatus)} value={status} />

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-220 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Mã bài
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Học sinh
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Kỳ thi
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Giáo viên chấm
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Trạng thái
                </th>
                <th className="px-5 py-3.5 text-right text-[11px] font-extrabold uppercase text-slate-500">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {assignmentsQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={6}>
                    Đang tải…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={6}>
                    Không có bài nào cần chấm.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const assignment = getAssignmentStatusDisplay(row.assignmentStatus)
                  const completed = row.assignmentStatus === 'COMPLETED'
                  return (
                    <tr className="border-b border-slate-100" key={row.candidateResultId}>
                      <td className="px-5 py-3.5">
                        <ResultCode code={row.resultCode} />
                        {row.flagged ? (
                          <div className="mt-1">
                            <FlaggedChip />
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold ${avatarClasses(row.studentName ?? '?')}`}
                          >
                            {initials(row.studentName ?? '?')}
                          </span>
                          <div className="leading-tight">
                            <div className="text-[13.5px] font-bold text-slate-900">
                              {row.studentName ?? '—'}
                            </div>
                            <div className="text-[11.5px] font-semibold text-slate-400">
                              {row.className ? `Lớp ${row.className}` : 'Chưa xếp lớp'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-600">
                        {row.examName ?? '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {row.teacherName ? (
                          <>
                            <div className="text-[13px] font-bold text-slate-700">
                              {row.teacherName}
                            </div>
                            <div className="text-[11px] font-medium text-slate-400">
                              Giao {formatIsoDateTime(row.assignedAt)}
                            </div>
                          </>
                        ) : (
                          <span className="text-[13px] font-semibold text-slate-400">
                            Chưa phân công
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge label={assignment.label} tone={assignment.tone} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {/* Nhà trường luôn xem/chấm trực tiếp được, kể cả bài chưa gán ai
                              hoặc đang gán cho giáo viên khác — không phụ thuộc phân công. */}
                          <button
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[12.5px] font-bold text-slate-600 transition hover:bg-slate-50"
                            onClick={() => navigate(`/school-admin/grading/${row.candidateResultId}`)}
                            type="button"
                          >
                            <Mic className="size-4" />
                            {completed ? 'Xem lại' : 'Xem / Chấm'}
                          </button>
                          {completed ? (
                            <span className="text-[12.5px] font-semibold text-slate-400">
                              Đã chốt {formatIsoDateTime(row.completedAt)}
                            </span>
                          ) : (
                            <>
                              <button
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 text-[12.5px] font-bold text-white transition hover:bg-cyan-700"
                                onClick={() => setAssignTarget(row)}
                                type="button"
                              >
                                {row.assignmentId ? (
                                  <>
                                    <UserRoundCog className="size-4" />
                                    Đổi giáo viên
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="size-4" />
                                    Phân công
                                  </>
                                )}
                              </button>
                              {row.assignmentId ? (
                                <button
                                  aria-label={`Gỡ phân công bài ${row.resultCode}`}
                                  className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                  onClick={() => setRemoveTarget(row)}
                                  type="button"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3.5">
          <span className="text-[12.5px] font-semibold text-slate-500">
            <b className="text-slate-900">{totalElements}</b> bài · trang {totalPages ? page : 0}/
            {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] font-bold text-slate-700 disabled:opacity-50"
              disabled={assignmentsQuery.isFetching || page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] font-bold text-slate-700 disabled:opacity-50"
              disabled={assignmentsQuery.isFetching || page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {assignTarget ? (
        <AssignTeacherDialog
          currentTeacherId={assignTarget.teacherId}
          isPending={assignMutation.isPending || reassignMutation.isPending}
          onCancel={() => setAssignTarget(null)}
          onConfirm={confirmAssign}
          resultCode={assignTarget.resultCode}
          studentName={assignTarget.studentName}
        />
      ) : null}

      {removeTarget ? (
        <RemoveAssignmentDialog
          isPending={removeMutation.isPending}
          onCancel={() => setRemoveTarget(null)}
          onConfirm={confirmRemove}
          resultCode={removeTarget.resultCode}
          teacherName={removeTarget.teacherName}
        />
      ) : null}

      {autoAssignOpen ? (
        <AutoAssignDialog
          examName={selectedExamName}
          isPending={autoAssignMutation.isPending}
          onCancel={() => setAutoAssignOpen(false)}
          onConfirm={confirmAutoAssign}
          unassignedCount={stats?.unassigned ?? 0}
        />
      ) : null}

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
    </section>
  )
}

// ============================= Teacher: Queue =============================

export function TeacherGradingPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'' | GradingAssignmentStatus>('')
  const tasksQuery = useMyGradingTasksQuery(page, PAGE_SIZE, { status })

  // Số cho thẻ thống kê phải là TỔNG toàn bộ, không phải đếm trên trang hiện tại
  // (và phải độc lập với filter đang chọn). Hai query size=1 chỉ để lấy totalElements;
  // enum chỉ có ASSIGNED/COMPLETED nên tổng được giao = pending + done.
  const assignedCountQuery = useMyGradingTasksQuery(1, 1, { status: 'ASSIGNED' })
  const completedCountQuery = useMyGradingTasksQuery(1, 1, { status: 'COMPLETED' })

  const pageData = tasksQuery.data
  const tasks = pageData?.content ?? []
  // Footer phân trang bám theo list đang xem (đã lọc); thẻ thống kê dùng tổng chung.
  const totalElements = pageData?.totalElements ?? 0
  const totalPages = pageData?.totalPages ?? 0
  const pending = assignedCountQuery.data?.totalElements ?? 0
  const done = completedCountQuery.data?.totalElements ?? 0
  const totalAssigned = pending + done

  return (
    <section className="mx-auto max-w-300">
      <div>
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-cyan-700">Chấm bài</p>
        <h1 className="mt-1.5 text-[30px] font-extrabold tracking-tight text-slate-900">
          Bài cần chấm
        </h1>
        <p className="mt-1.5 max-w-xl text-[15px] text-slate-500">
          Nghe lại bài nói và chấm theo từng tiêu chí của rubric. Bạn chấm ẩn danh — hệ thống không
          hiển thị thông tin học sinh.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Headphones size={19} />} iconTone="amber" label="Cần chấm" value={pending} />
        <StatCard
          icon={<CircleCheck size={19} />}
          iconTone="emerald"
          label="Đã chấm xong"
          value={done}
        />
        <StatCard
          icon={<Inbox size={19} />}
          iconTone="indigo"
          label="Tổng được giao"
          value={totalAssigned}
        />
      </div>

      <FilterChips
        items={TEACHER_STATUS_FILTERS}
        onChange={(next) => {
          setStatus(next)
          setPage(1)
        }}
        value={status}
      />

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Mã bài
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Kỳ thi
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Số phần
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Trạng thái
                </th>
                <th className="px-5 py-3.5 text-right text-[11px] font-extrabold uppercase text-slate-500">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {tasksQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={5}>
                    Đang tải…
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={5}>
                    Chưa có bài nào được giao cho bạn.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const completed = task.status === 'COMPLETED'
                  const display = getAssignmentStatusDisplay(task.status)
                  return (
                    <tr className="border-b border-slate-100" key={task.assignmentId}>
                      <td className="px-5 py-3.5">
                        <ResultCode code={task.resultCode} />
                        {task.flagged ? (
                          <div className="mt-1">
                            <FlaggedChip />
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-[13.5px] font-semibold text-slate-700">
                          {task.examName ?? '—'}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-400">
                          Giao {formatIsoDateTime(task.assignedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-600">
                        {task.partCount} phần
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge label={display.label} tone={display.tone} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          className={[
                            'inline-flex h-9.5 items-center gap-1.5 rounded-lg px-4 text-[13px] font-bold transition',
                            completed
                              ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              : 'bg-cyan-600 text-white hover:bg-cyan-700',
                          ].join(' ')}
                          onClick={() => navigate(`/teacher/grading/${task.assignmentId}`)}
                          type="button"
                        >
                          <Mic className="size-4" />
                          {completed ? 'Xem lại' : 'Chấm ngay'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3.5">
          <span className="text-[12.5px] font-semibold text-slate-500">
            <b className="text-slate-900">{totalElements}</b> bài · trang {totalPages ? page : 0}/
            {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] font-bold text-slate-700 disabled:opacity-50"
              disabled={tasksQuery.isFetching || page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] font-bold text-slate-700 disabled:opacity-50"
              disabled={tasksQuery.isFetching || page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================= Teacher: Grade one submission =============================

type ScoreState = Record<string, Record<string, number | null>>

/** Điểm khởi tạo: mồi từ bản chấm đang có hiệu lực để giáo viên chỉ chỉnh chỗ cần đổi. */
function initialScores(detail: GradingTaskDetail): ScoreState {
  const result: ScoreState = {}
  for (const item of detail.items) {
    const perCriterion: Record<string, number | null> = {}
    for (const criterion of detail.criteria) {
      const current = item.currentScores.find((score) => score.criterionId === criterion.id)
      perCriterion[criterion.id] = current?.score ?? null
    }
    result[item.paperItemId] = perCriterion
  }
  return result
}

function initialFeedback(detail: GradingTaskDetail): Record<string, string> {
  const result: Record<string, string> = {}
  for (const item of detail.items) {
    result[item.paperItemId] = item.currentFeedbackSummary ?? ''
  }
  return result
}

type PreviewResult = { data?: { totalScore?: number | null; resultBandName?: string | null; itemScores: Array<{ paperItemId: string; itemScore?: number | null }> }; isFetching: boolean }

/**
 * Màn chấm dùng chung cho cả giáo viên (theo assignmentId) và nhà trường (theo
 * candidateResultId, có thể chưa có phân công) — cùng UI, chỉ khác cách gọi
 * API ở phía trên. `detail.assignmentId` null xảy ra đúng ở luồng nhà trường
 * chấm một bài chưa ai nhận.
 */
function GradingTaskDetailView({
  detail,
  invalidatePending,
  onBack,
  onInvalidate,
  onSubmit,
  submitPending,
  usePreview,
}: {
  detail: GradingTaskDetail
  invalidatePending: boolean
  onBack: () => void
  onInvalidate: (reason: string, handlers: { onError: (error: unknown) => void; onSuccess: () => void }) => void
  onSubmit: (
    items: ItemGradeInput[],
    handlers: { onError: (error: unknown) => void; onSuccess: (totalScore?: number | null) => void },
  ) => void
  submitPending: boolean
  usePreview: (items: ItemGradeInput[], enabled: boolean) => PreviewResult
}) {
  const [scores, setScores] = useState<ScoreState>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [activeItemId, setActiveItemId] = useState('')
  const [initializedFor, setInitializedFor] = useState<string | null>(null)
  const [flagAcknowledged, setFlagAcknowledged] = useState(false)
  const [invalidateOpen, setInvalidateOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Đồng bộ state khi mở một bài khác (điều hướng trực tiếp giữa các bài). Khoá theo
  // candidateResultId, KHÔNG phải assignmentId: assignmentId có thể null (bài chưa
  // gán ai) nên không phân biệt được giữa hai bài chưa gán khác nhau.
  if (detail.candidateResultId !== initializedFor) {
    setScores(initialScores(detail))
    setFeedback(initialFeedback(detail))
    setActiveItemId(detail.items[0]?.paperItemId ?? '')
    setFlagAcknowledged(false)
    setInitializedFor(detail.candidateResultId)
  }

  /**
   * Chỉ gửi lên preview những phần đã nhập ĐỦ tiêu chí bắt buộc — BE từ chối phần
   * thiếu tiêu chí, còn phần chưa gửi thì nó tự dùng điểm đang lưu. Nhờ vậy tổng
   * cập nhật dần theo từng phần thay vì im lặng tới khi chấm xong hết.
   */
  const previewItems = useMemo<ItemGradeInput[]>(() => {
    const required = detail.criteria.filter((criterion) => criterion.required)
    return detail.items
      .filter((item) =>
        required.every((criterion) => scores[item.paperItemId]?.[criterion.id] != null),
      )
      .map((item) => ({
        // KHÔNG đưa feedbackSummary vào đây: tổng điểm chỉ phụ thuộc bộ điểm, mà
        // payload nằm trong queryKey — kèm feedback thì mỗi lần gõ nhận xét lại bắn
        // một request preview trả về đúng con số cũ. Feedback vẫn gửi đủ ở lúc nộp.
        criterionScores: detail.criteria
          .filter((criterion) => scores[item.paperItemId]?.[criterion.id] != null)
          .map((criterion) => ({
            rubricCriterionId: criterion.id,
            score: scores[item.paperItemId][criterion.id] as number,
          })),
        paperItemId: item.paperItemId,
      }))
  }, [detail, scores])

  const debouncedPreviewItems = useDebouncedValue(previewItems, PREVIEW_DEBOUNCE_MS)
  const previewQuery = usePreview(debouncedPreviewItems, detail.editable === true)

  const readOnly = !detail.editable
  const activeItem = detail.items.find((item) => item.paperItemId === activeItemId) ?? detail.items[0]
  const allFilled = isEveryRequiredCriterionFilled(detail, scores)
  const preview = previewQuery.data
  const previewItemScore = (paperItemId: string) =>
    preview?.itemScores.find((score) => score.paperItemId === paperItemId)?.itemScore ?? null
  // Bài nghi vấn: bắt xem và quyết trước, không cho chấm ngay để tránh bỏ sót vi phạm.
  const blockedByFlag = detail.flagged && !flagAcknowledged && !readOnly

  function setScore(paperItemId: string, criterionId: string, value: number | null) {
    setScores((current) => ({
      ...current,
      [paperItemId]: { ...current[paperItemId], [criterionId]: value },
    }))
  }

  function doSubmit() {
    // Nộp cả bài: mọi phần, mỗi phần đủ tiêu chí bắt buộc. Nộp thiếu phần sẽ chốt
    // phân công mà phần còn lại vẫn giữ điểm AI — không cho rơi vào tình huống đó.
    const items: ItemGradeInput[] = detail.items.map((item) => ({
      criterionScores: detail.criteria
        .filter((criterion) => scores[item.paperItemId]?.[criterion.id] != null)
        .map((criterion) => ({
          rubricCriterionId: criterion.id,
          score: scores[item.paperItemId][criterion.id] as number,
        })),
      feedbackSummary: feedback[item.paperItemId] || undefined,
      paperItemId: item.paperItemId,
    }))
    onSubmit(items, {
      onError: (error) => {
        setSubmitOpen(false)
        setMessage(toApiError(error).message)
      },
      onSuccess: (totalScore) => {
        setSubmitOpen(false)
        setMessage(`Đã nộp điểm. Tổng ${formatScore(totalScore)}.`)
        window.setTimeout(onBack, 900)
      },
    })
  }

  function doInvalidate(reason: string) {
    onInvalidate(reason, {
      onError: (error) => {
        setInvalidateOpen(false)
        setMessage(toApiError(error).message)
      },
      onSuccess: () => {
        setInvalidateOpen(false)
        setMessage('Đã vô hiệu bài thi do vi phạm.')
        window.setTimeout(onBack, 900)
      },
    })
  }

  const resultDisplay = getResultStatusDisplay(detail.resultStatus)

  return (
    <section className="mx-auto max-w-300">
      <BackButton onClick={onBack} />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-cyan-700">Chấm bài</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <h1 className="text-[25px] font-extrabold tracking-tight text-slate-900">
              Bài #{detail.resultCode}
            </h1>
            <StatusBadge label={resultDisplay.label} tone={resultDisplay.tone} />
          </div>
          <p className="mt-1 text-[13.5px] font-medium text-slate-500">
            {detail.examName ?? 'Kỳ thi'} · {detail.items.length} phần thi ·{' '}
            {detail.criteria.length} tiêu chí
          </p>
        </div>
        {readOnly ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-600">
            <CircleCheck className="size-4" />
            Chỉ xem — bài đã chốt
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700">
            <ShieldCheck className="size-4" />
            Chấm ẩn danh
          </div>
        )}
      </div>

      {readOnly ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <Info className="mt-0.5 size-4.5 shrink-0 text-slate-400" />
          <div className="text-[12.5px] font-medium leading-relaxed text-slate-600">
            Bài này đã được chốt điểm và không thể chấm lại. Bạn đang xem lại điểm đã nộp.
            {detail.currentTotalScore != null ? (
              <>
                {' '}
                Tổng điểm: <b className="text-slate-900">{formatScore(detail.currentTotalScore)}</b>.
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {detail.flagged && !readOnly ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-2.5">
            <Flag className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <div className="text-[13.5px] font-extrabold text-amber-900">
                Bài thi bị đánh dấu nghi vấn
              </div>
              {detail.flagReason ? (
                <p className="mt-1 text-[12.5px] leading-relaxed text-amber-800">
                  {detail.flagReason}
                </p>
              ) : null}
              <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-amber-700">
                Nghe bài rồi quyết định. Cờ chỉ thực sự được gỡ khi bạn <b>nộp điểm</b> — rời trang
                giữa chừng thì bài vẫn còn cờ.
              </p>
              {flagAcknowledged ? null : (
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-[13px] font-bold text-white transition hover:bg-emerald-700"
                    onClick={() => setFlagAcknowledged(true)}
                    type="button"
                  >
                    <ShieldCheck className="size-4" />
                    Không vi phạm — tiếp tục chấm
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-300 bg-white px-4 text-[13px] font-bold text-red-600 transition hover:bg-red-50"
                    onClick={() => setInvalidateOpen(true)}
                    type="button"
                  >
                    <ShieldAlert className="size-4" />
                    Xác nhận vi phạm
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {blockedByFlag ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-16 text-center text-sm text-slate-400">
          Hãy quyết định về cờ nghi vấn ở trên trước khi chấm điểm.
        </div>
      ) : (
        <div className="grid gap-7">
          {detail.items.length > 1 ? (
            <TabPillGroup
              items={itemTabItems(detail.items)}
              onChange={setActiveItemId}
              value={activeItem?.paperItemId ?? ''}
            />
          ) : null}

          {(activeItem ? [activeItem] : []).map((item) => (
            <div className="grid gap-4.5 lg:grid-cols-[1.15fr_1fr]" key={item.paperItemId}>
              <div className="grid gap-4.5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
                      <Mic className="size-4.5 text-cyan-700" />
                      Bản ghi bài nói · {item.partLabel ?? 'Phần thi'}
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {item.turns.length} lượt
                    </span>
                  </div>
                  <div className="mt-4">
                    <GradingTurnList turns={item.turns} />
                  </div>
                  <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-violet-50 px-3.5 py-3">
                    <Bot className="size-4.5 text-violet-600" />
                    <span className="flex-1 text-[12.5px] font-semibold text-violet-700">
                      Điểm của bản chấm hiện tại
                    </span>
                    <span className="text-[12.5px] font-bold text-violet-700">
                      {formatScore(item.currentItemScore)}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
                  <div className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
                    <ClipboardList className="size-4.5 text-cyan-700" />
                    Nhận xét · {item.partLabel ?? 'Phần thi'}
                  </div>
                  <textarea
                    aria-label={`Nhận xét cho ${item.partLabel ?? 'phần thi'}`}
                    className="mt-3 min-h-30 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13.5px] leading-relaxed text-slate-700 outline-none focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={readOnly}
                    maxLength={2048}
                    onChange={(event) =>
                      setFeedback((current) => ({
                        ...current,
                        [item.paperItemId]: event.target.value,
                      }))
                    }
                    placeholder="Nhận xét riêng cho phần thi này…"
                    value={feedback[item.paperItemId] ?? ''}
                  />
                </div>
              </div>

              <div className="grid gap-3.5">
                <div className="flex items-center justify-between rounded-2xl border-2 border-cyan-500 bg-linear-to-r from-cyan-50 to-white px-5 py-4">
                  <div>
                    <div className="text-[12.5px] font-bold text-cyan-700">
                      Điểm phần · {item.partLabel ?? 'Phần thi'}
                    </div>
                    <div className="text-[11.5px] font-medium text-slate-400">
                      Hệ thống tính theo trọng số tiêu chí
                    </div>
                  </div>
                  <div className="text-[38px] font-extrabold leading-none text-cyan-600">
                    {readOnly
                      ? formatScore(item.currentItemScore)
                      : formatScore(previewItemScore(item.paperItemId))}
                  </div>
                </div>

                {detail.criteria.map((criterion) => (
                  <CriterionScoreCard
                    criterion={criterion}
                    currentValue={
                      item.currentScores.find((score) => score.criterionId === criterion.id)
                        ?.score ?? null
                    }
                    key={criterion.id}
                    onChange={(value) => setScore(item.paperItemId, criterion.id, value)}
                    readOnly={readOnly}
                    value={scores[item.paperItemId]?.[criterion.id] ?? null}
                  />
                ))}
              </div>
            </div>
          ))}

          {readOnly ? (
            <div className="inline-flex h-12.5 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-[15px] font-bold text-slate-500">
              <CircleCheck className="size-5" />
              Bài đã chốt — không thể chấm lại
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <div>
                  <div className="text-[12.5px] font-bold text-emerald-700">
                    Tổng điểm cả bài (tạm tính)
                  </div>
                  <div className="text-[11.5px] font-medium text-emerald-700/70">
                    {previewQuery.isFetching
                      ? 'Đang tính lại…'
                      : allFilled
                        ? 'Hệ thống tính từ điểm tiêu chí bạn nhập'
                        : 'Phần chưa chấm đang dùng điểm hiện tại'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[34px] font-extrabold leading-none text-emerald-600">
                    {formatScore(preview?.totalScore)}
                  </div>
                  {preview?.resultBandName ? (
                    <div className="text-[11.5px] font-bold text-emerald-700/80">
                      {preview.resultBandName}
                    </div>
                  ) : null}
                </div>
              </div>
              <button
                className="inline-flex h-12.5 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 text-[15px] font-bold text-white shadow-lg shadow-cyan-600/30 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                disabled={!allFilled || submitPending}
                onClick={() => setSubmitOpen(true)}
                type="button"
              >
                <CircleCheck className="size-5" />
                {allFilled
                  ? `Nộp điểm cho ${detail.items.length} phần thi`
                  : 'Chấm đủ tiêu chí bắt buộc của mọi phần để nộp'}
              </button>
            </div>
          )}
        </div>
      )}

      {invalidateOpen ? (
        <InvalidateDialog
          flagReason={detail.flagReason}
          isPending={invalidatePending}
          onCancel={() => setInvalidateOpen(false)}
          onConfirm={doInvalidate}
          resultCode={detail.resultCode}
        />
      ) : null}

      {submitOpen ? (
        <SubmitGradingDialog
          flagged={detail.flagged}
          isPending={submitPending}
          onCancel={() => setSubmitOpen(false)}
          onConfirm={doSubmit}
          partCount={detail.items.length}
          resultBandName={preview?.resultBandName}
          resultCode={detail.resultCode}
          totalScore={preview?.totalScore}
        />
      ) : null}

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
    </section>
  )
}

export function TeacherGradingTaskPage() {
  const navigate = useNavigate()
  const { assignmentId } = useParams()
  const detailQuery = useGradingTaskDetailQuery(assignmentId ?? null)
  const submitMutation = useSubmitGradingMutation()
  const invalidateMutation = useInvalidateGradingMutation()
  const detail = detailQuery.data

  if (detailQuery.isLoading) {
    return <PageLoader />
  }

  if (!detail || !detail.assignmentId) {
    return (
      <section className="mx-auto max-w-300">
        <BackButton onClick={() => navigate('/teacher/grading')} />
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-16 text-center text-sm text-slate-400">
          Không tìm thấy bài cần chấm.
        </div>
      </section>
    )
  }
  const currentAssignmentId = detail.assignmentId

  return (
    <GradingTaskDetailView
      detail={detail}
      invalidatePending={invalidateMutation.isPending}
      onBack={() => navigate('/teacher/grading')}
      onInvalidate={(reason, handlers) =>
        invalidateMutation.mutate(
          { assignmentId: currentAssignmentId, reason: reason || undefined },
          handlers,
        )
      }
      onSubmit={(items, handlers) =>
        submitMutation.mutate(
          { assignmentId: currentAssignmentId, items },
          { onError: handlers.onError, onSuccess: (result) => handlers.onSuccess(result.totalScore) },
        )
      }
      submitPending={submitMutation.isPending}
      usePreview={(items, enabled) =>
        useGradingPreviewQuery(currentAssignmentId, items, { enabled })
      }
    />
  )
}

// ============================= School Admin: Grade one submission directly =============================

/**
 * Nhà trường xem/chấm trực tiếp theo candidateResultId — không cần phân công
 * trước, xem được cả bài chưa gán ai hoặc đang gán cho giáo viên khác.
 */
export function SchoolAdminGradingTaskPage() {
  const navigate = useNavigate()
  const { candidateResultId } = useParams()
  const detailQuery = useGradingTaskDetailBySchoolQuery(candidateResultId ?? null)
  const submitMutation = useSubmitGradingByResultMutation()
  const invalidateMutation = useInvalidateGradingByResultMutation()
  const detail = detailQuery.data

  if (detailQuery.isLoading) {
    return <PageLoader />
  }

  if (!detail) {
    return (
      <section className="mx-auto max-w-300">
        <BackButton onClick={() => navigate('/school-admin/grading')} />
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-16 text-center text-sm text-slate-400">
          Không tìm thấy bài cần chấm.
        </div>
      </section>
    )
  }
  const currentCandidateResultId = detail.candidateResultId

  return (
    <GradingTaskDetailView
      detail={detail}
      invalidatePending={invalidateMutation.isPending}
      onBack={() => navigate('/school-admin/grading')}
      onInvalidate={(reason, handlers) =>
        invalidateMutation.mutate(
          { candidateResultId: currentCandidateResultId, reason: reason || undefined },
          handlers,
        )
      }
      onSubmit={(items, handlers) =>
        submitMutation.mutate(
          { candidateResultId: currentCandidateResultId, items },
          { onError: handlers.onError, onSuccess: (result) => handlers.onSuccess(result.totalScore) },
        )
      }
      submitPending={submitMutation.isPending}
      usePreview={(items, enabled) =>
        useGradingPreviewByResultQuery(currentCandidateResultId, items, { enabled })
      }
    />
  )
}
