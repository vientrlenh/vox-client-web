import { useMemo, useState } from 'react'
import {
  AlarmClock,
  ArrowLeft,
  Bot,
  CalendarClock,
  CircleCheck,
  ClipboardList,
  Download,
  Flag,
  Gavel,
  Headphones,
  History,
  Inbox,
  Info,
  Lock,
  Mic,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  TimerReset,
  Trash2,
  Undo2,
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
  useExportExamScoresMutation,
  useFinalizeExamResultsMutation,
  useFinalizePreviewQuery,
} from '../api/useExamResultMutations'
import {
  useAssignGradingMutation,
  useAutoAssignGradingMutation,
  useClearInvalidResultMutation,
  useDeclineGradingAssignmentMutation,
  useInvalidateResultMutation,
  useReassignGradingMutation,
  useReclaimOverdueMutation,
  useRegradeResultMutation,
  useRemoveGradingAssignmentMutation,
  useSetGradingDeadlineMutation,
  useUpholdResultMutation,
  type ItemGradeInput,
} from '../api/useGradingMutations'
import { useGradingPreviewQuery } from '../api/useGradingPreviewQuery'
import {
  useGradingAssignmentsQuery,
  useGradingExamOptionsQuery,
  useGradingStatsQuery,
  useGradingTaskDetailQuery,
  useMyGradingTasksQuery,
} from '../api/useGradingQueries'
import { AiQualityPanel } from '../components/AiQualityPanel'
import { AssignTeacherDialog } from '../components/AssignTeacherDialog'
import { AutoAssignDialog } from '../components/AutoAssignDialog'
import { CriterionScoreCard } from '../components/CriterionScoreCard'
import { FinalizeExamDialog } from '../components/FinalizeExamDialog'
import { GradingDecisionDialog, type DecisionOutcome } from '../components/GradingDecisionDialog'
import { GradingTurnList } from '../components/GradingTurnList'
import { ReclaimOverdueDialog } from '../components/ReclaimOverdueDialog'
import { RemoveAssignmentDialog } from '../components/RemoveAssignmentDialog'
import { ResultHistoryDialog } from '../components/ResultHistoryDialog'
import { SetDeadlineDialog } from '../components/SetDeadlineDialog'
import { SubmitGradingDialog } from '../components/SubmitGradingDialog'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import {
  avatarClasses,
  formatIsoDateTime,
  formatScore,
  getAssignmentStatusDisplay,
  getOutcomeDisplay,
  getResultStatusDisplay,
  getRoundTypeDisplay,
  initials,
  isEveryRequiredCriterionFilled,
  type ExamCandidateResultStatus,
  type GradingAssignmentRow,
  type GradingAssignmentStatus,
  type GradingRoundType,
  type GradingTaskDetail,
  type GradingTaskItem,
} from '../types'

const PAGE_SIZE = 20
const PREVIEW_DEBOUNCE_MS = 500

const ASSIGNMENT_STATUS_FILTERS: Array<{ label: string; value: '' | GradingAssignmentStatus }> = [
  { label: 'Tất cả', value: '' },
  { label: 'Đang chấm', value: 'ASSIGNED' },
  { label: 'Đã chấm xong', value: 'COMPLETED' },
]

const ROUND_FILTERS: Array<{ label: string; value: '' | GradingRoundType }> = [
  { label: 'Tất cả vòng chấm', value: '' },
  { label: 'Chấm lần đầu', value: 'INITIAL' },
  { label: 'Hậu kiểm', value: 'SPOT_CHECK' },
  { label: 'Soi bài vô hiệu', value: 'REMEDIATION' },
  { label: 'Phúc khảo', value: 'APPEAL' },
]

const RESULT_STATUS_FILTERS: Array<{ label: string; value: '' | ExamCandidateResultStatus }> = [
  { label: 'Mọi trạng thái bài', value: '' },
  { label: 'Chờ chấm', value: 'PENDING_REVIEW' },
  { label: 'Đã công bố', value: 'RELEASED' },
  { label: 'Đang phúc khảo', value: 'APPEALED' },
  { label: 'Đang chấm phúc khảo', value: 'RE_GRADING' },
  { label: 'Đã vô hiệu', value: 'INVALID' },
  { label: 'Đã chốt', value: 'FINAL' },
]

const ADMIN_TABS: TabPillItem[] = [
  { label: 'Điều phối chấm bài', value: 'board' },
  { label: 'Chất lượng AI', value: 'ai' },
]

function ResultCode({ code }: { code: string }) {
  return (
    <span className="inline-flex h-7 items-center rounded-lg bg-slate-100 px-2.5 font-mono text-[12.5px] font-bold tracking-wide text-slate-700">
      #{code}
    </span>
  )
}

function RoundBadge({ roundType }: { roundType: GradingRoundType | null | undefined }) {
  const display = getRoundTypeDisplay(roundType)
  return <StatusBadge label={display.label} tone={display.tone} />
}

/** Nhãn hạn chấm; quá hạn thì đỏ. `overdue` do BE tính, FE không tự so giờ. */
function DeadlineLabel({ deadlineAt, overdue }: { deadlineAt?: string | null; overdue: boolean }) {
  if (!deadlineAt) {
    return <span className="text-[12px] font-semibold text-slate-300">Chưa đặt hạn</span>
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-[12px] font-bold ${
        overdue ? 'text-red-600' : 'text-slate-500'
      }`}
    >
      {overdue ? <AlarmClock className="size-3.5" /> : <CalendarClock className="size-3.5" />}
      {formatIsoDateTime(deadlineAt)}
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

// ============================= School Admin: Coordination board =============================

export function SchoolAdminGradingPage() {
  const [tab, setTab] = useState('board')
  const [examId, setExamId] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | GradingAssignmentStatus>('')
  const [roundType, setRoundType] = useState<'' | GradingRoundType>('')
  const [resultStatus, setResultStatus] = useState<'' | ExamCandidateResultStatus>('')
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [openAppealOnly, setOpenAppealOnly] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [assignTarget, setAssignTarget] = useState<GradingAssignmentRow | null>(null)
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<GradingAssignmentRow | null>(null)
  const [historyTarget, setHistoryTarget] = useState<GradingAssignmentRow | null>(null)
  const [autoAssignOpen, setAutoAssignOpen] = useState(false)
  const [deadlineOpen, setDeadlineOpen] = useState(false)
  const [reclaimOpen, setReclaimOpen] = useState(false)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const debouncedSearch = useDebouncedValue(search, 350)
  const rowsQuery = useGradingAssignmentsQuery(page, PAGE_SIZE, {
    examId,
    hasOpenAppeal: openAppealOnly,
    overdueOnly,
    resultStatus,
    roundType,
    search: debouncedSearch,
    status,
    unassignedOnly,
  })
  const statsQuery = useGradingStatsQuery({ examId })
  const examOptionsQuery = useGradingExamOptionsQuery()
  const finalizePreviewQuery = useFinalizePreviewQuery(finalizeOpen && examId ? examId : null)

  const assignMutation = useAssignGradingMutation()
  const reassignMutation = useReassignGradingMutation()
  const removeMutation = useRemoveGradingAssignmentMutation()
  const autoAssignMutation = useAutoAssignGradingMutation()
  const deadlineMutation = useSetGradingDeadlineMutation()
  const reclaimMutation = useReclaimOverdueMutation()
  const finalizeMutation = useFinalizeExamResultsMutation()
  const exportMutation = useExportExamScoresMutation()

  const pageData = rowsQuery.data
  const rows = pageData?.content ?? []
  const totalPages = pageData?.totalPages ?? 0
  const totalElements = pageData?.totalElements ?? 0
  const stats = statsQuery.data
  const selectedExamName = examOptionsQuery.data?.find((exam) => exam.id === examId)?.name

  // Chỉ tick được các dòng trong TRANG hiện tại — chọn xong sang trang khác thì tick
  // cũ không còn dòng tương ứng, nên lọc lại theo `rows` mỗi lần render.
  const selectedRows = rows.filter((row) => selectedIds.includes(row.candidateResultId))
  const selectableUnassigned = selectedRows.filter((row) => !row.assignmentId)
  const selectedAssignmentIds = selectedRows
    .map((row) => row.assignmentId)
    .filter((id): id is string => !!id)
  const canBulkAssign =
    selectedRows.length > 0 && selectableUnassigned.length === selectedRows.length
  const canSetDeadline = selectedAssignmentIds.length === selectedRows.length && selectedRows.length > 0

  function resetToFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
      setSelectedIds([])
    }
  }

  function toggleRow(candidateResultId: string) {
    setSelectedIds((current) =>
      current.includes(candidateResultId)
        ? current.filter((id) => id !== candidateResultId)
        : [...current, candidateResultId],
    )
  }

  function toggleAllOnPage() {
    setSelectedIds((current) =>
      rows.every((row) => current.includes(row.candidateResultId))
        ? current.filter((id) => !rows.some((row) => row.candidateResultId === id))
        : [...new Set([...current, ...rows.map((row) => row.candidateResultId)])],
    )
  }

  const errorToast = (error: unknown) => setMessage(toApiError(error).message)

  function confirmAssign(input: {
    deadlineAt: string | null
    roundType: GradingRoundType
    teacherId: string
  }) {
    const target = assignTarget
    if (!target) {
      return
    }
    // Cùng một modal cho gán mới và đổi người; đổi người là endpoint khác vì nó
    // không tạo vòng mới, chỉ thay teacherId của phân công đang mở.
    if (target.assignmentId) {
      reassignMutation.mutate(
        { assignmentId: target.assignmentId, teacherId: input.teacherId },
        {
          onError: errorToast,
          onSuccess: () => {
            setAssignTarget(null)
            setMessage(`Đã đổi giáo viên chấm bài #${target.resultCode}.`)
          },
        },
      )
      return
    }
    assignMutation.mutate(
      {
        assignments: [{ candidateResultId: target.candidateResultId, teacherId: input.teacherId }],
        deadlineAt: input.deadlineAt,
        roundType: input.roundType,
      },
      {
        onError: errorToast,
        onSuccess: () => {
          setAssignTarget(null)
          setMessage(`Đã phân công chấm bài #${target.resultCode}.`)
        },
      },
    )
  }

  function confirmBulkAssign(input: {
    deadlineAt: string | null
    roundType: GradingRoundType
    teacherId: string
  }) {
    assignMutation.mutate(
      {
        assignments: selectableUnassigned.map((row) => ({
          candidateResultId: row.candidateResultId,
          teacherId: input.teacherId,
        })),
        deadlineAt: input.deadlineAt,
        roundType: input.roundType,
      },
      {
        onError: errorToast,
        onSuccess: () => {
          setBulkAssignOpen(false)
          setMessage(`Đã phân công ${selectableUnassigned.length} bài.`)
          setSelectedIds([])
        },
      },
    )
  }

  function confirmRemove() {
    const target = removeTarget
    if (!target?.assignmentId) {
      return
    }
    removeMutation.mutate(target.assignmentId, {
      onError: (error) => {
        setRemoveTarget(null)
        errorToast(error)
      },
      onSuccess: () => {
        setRemoveTarget(null)
        setMessage(`Đã gỡ phân công bài #${target.resultCode}.`)
      },
    })
  }

  function confirmAutoAssign(input: Parameters<typeof autoAssignMutation.mutate>[0]) {
    autoAssignMutation.mutate(
      { ...input, examId },
      {
        onError: errorToast,
        onSuccess: (assignmentIds) => {
          setAutoAssignOpen(false)
          setMessage(
            assignmentIds.length > 0
              ? `Đã phân công tự động ${assignmentIds.length} bài.`
              : 'Không có bài nào đủ điều kiện cho vòng chấm đã chọn.',
          )
        },
      },
    )
  }

  function confirmDeadline(deadlineAt: string | null) {
    deadlineMutation.mutate(
      { assignmentIds: selectedAssignmentIds, deadlineAt },
      {
        onError: errorToast,
        onSuccess: (ids) => {
          setDeadlineOpen(false)
          setSelectedIds([])
          setMessage(
            deadlineAt
              ? `Đã đặt hạn chấm cho ${ids.length} phân công.`
              : `Đã gỡ hạn chấm của ${ids.length} phân công.`,
          )
        },
      },
    )
  }

  function confirmReclaim(input: { newDeadlineAt: string | null; reassignToTeacherIds: string[] }) {
    reclaimMutation.mutate(
      {
        // Không tick dòng nào = thu hồi mọi phân công quá hạn trong phạm vi kỳ thi.
        assignmentIds: selectedAssignmentIds,
        examId: examId || undefined,
        newDeadlineAt: input.newDeadlineAt,
        reassignToTeacherIds: input.reassignToTeacherIds,
      },
      {
        onError: errorToast,
        onSuccess: (ids) => {
          setReclaimOpen(false)
          setSelectedIds([])
          setMessage(
            ids.length > 0
              ? `Đã thu hồi ${ids.length} phân công quá hạn.`
              : 'Không có phân công quá hạn nào để thu hồi.',
          )
        },
      },
    )
  }

  function confirmFinalize(releasePendingWithAiScores: boolean) {
    finalizeMutation.mutate(
      { examId, releasePendingWithAiScores },
      {
        onError: errorToast,
        onSuccess: (count) => {
          setFinalizeOpen(false)
          setMessage(`Đã chốt sổ ${count} kết quả của kỳ thi.`)
        },
      },
    )
  }

  const assignPending = assignMutation.isPending || reassignMutation.isPending

  return (
    <section className="mx-auto max-w-320">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-cyan-700">Chấm điểm</p>
          <h1 className="mt-1.5 text-[30px] font-extrabold tracking-tight text-slate-900">
            Điều phối chấm bài
          </h1>
          <p className="mt-1.5 max-w-2xl text-[15px] text-slate-500">
            Giao bài cho giáo viên ở bốn vòng chấm: <b>chấm lần đầu</b>, <b>hậu kiểm</b> bài đã công
            bố, <b>soi lại</b> bài bị vô hiệu và <b>phúc khảo</b> theo đơn học sinh.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13.5px] font-bold text-slate-600 transition hover:bg-slate-50"
            onClick={() => rowsQuery.refetch()}
            type="button"
          >
            <RefreshCw className="size-4" />
            Làm mới
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13.5px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={exportMutation.isPending}
            onClick={() =>
              exportMutation.mutate(
                { examId: examId || undefined, examName: selectedExamName },
                { onError: errorToast, onSuccess: () => setMessage('Đã tải bảng điểm CSV.') },
              )
            }
            type="button"
          >
            <Download className="size-4" />
            Xuất bảng điểm
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 text-[13.5px] font-bold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
            disabled={!examId}
            onClick={() => setFinalizeOpen(true)}
            title={examId ? undefined : 'Chọn kỳ thi trước khi chốt sổ'}
            type="button"
          >
            <Lock className="size-4" />
            Chốt sổ kỳ thi
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-cyan-600 px-4.5 text-[13.5px] font-bold text-white shadow-lg shadow-cyan-600/25 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            // BE bắt buộc phạm vi: phân công tự động luôn chạy trong một kỳ thi hoặc ca thi.
            disabled={!examId}
            onClick={() => setAutoAssignOpen(true)}
            title={examId ? undefined : 'Chọn kỳ thi trước khi phân công tự động'}
            type="button"
          >
            <UsersRound className="size-4.5" />
            Phân công tự động
          </button>
        </div>
      </div>

      <div className="mt-6">
        <TabPillGroup items={ADMIN_TABS} onChange={setTab} value={tab} />
      </div>

      {tab === 'ai' ? (
        <div className="mt-6">
          <AiQualityPanel examId={examId || undefined} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Inbox size={19} />}
              iconTone="indigo"
              label="Tổng số bài"
              value={stats?.total ?? '-'}
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
              label="Đang chấm"
              value={stats?.assigned ?? '-'}
            />
            <StatCard
              icon={<AlarmClock size={19} />}
              iconTone="emerald"
              label="Quá hạn"
              value={stats?.overdue ?? '-'}
            />
          </div>

          {stats && stats.byResultStatus.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5">
              <span className="text-[12px] font-extrabold uppercase text-slate-400">
                Theo trạng thái bài
              </span>
              {stats.byResultStatus.map((entry) => {
                const display = getResultStatusDisplay(entry.status)
                return (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-bold text-slate-600"
                    key={entry.status}
                  >
                    {display.label}
                    <b className="text-slate-900">{entry.count}</b>
                  </span>
                )
              })}
            </div>
          ) : null}

          {stats && stats.teacherProgress.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[12.5px] font-extrabold text-slate-700">
                <Scale className="size-4 text-slate-500" />
                Tiến độ theo giáo viên
              </div>
              <div className="flex flex-wrap gap-3 px-5 py-4">
                {stats.teacherProgress.map((teacher) => {
                  const name = teacher.teacherName ?? 'Không rõ'
                  return (
                    <div
                      className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3.5 py-2.5"
                      key={teacher.teacherId}
                    >
                      <span
                        className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold ${avatarClasses(name)}`}
                      >
                        {initials(name)}
                      </span>
                      <div className="leading-tight">
                        <div className="text-[13px] font-bold text-slate-800">{name}</div>
                        <div className="text-[11.5px] font-semibold text-slate-400">
                          {teacher.assigned} đang chấm · {teacher.completed} xong
                          {teacher.overdue > 0 ? (
                            <span className="text-red-600"> · {teacher.overdue} quá hạn</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

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
            <select
              aria-label="Lọc theo vòng chấm"
              className="h-11 min-w-44 rounded-lg border border-slate-200 bg-white px-3.5 text-[13.5px] font-semibold text-slate-700 outline-none focus:border-cyan-400"
              onChange={(event) =>
                resetToFirstPage(setRoundType)(event.target.value as '' | GradingRoundType)
              }
              value={roundType}
            >
              {ROUND_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Lọc theo trạng thái bài"
              className="h-11 min-w-44 rounded-lg border border-slate-200 bg-white px-3.5 text-[13.5px] font-semibold text-slate-700 outline-none focus:border-cyan-400"
              onChange={(event) =>
                resetToFirstPage(setResultStatus)(
                  event.target.value as '' | ExamCandidateResultStatus,
                )
              }
              value={resultStatus}
            >
              {RESULT_STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="relative min-w-60 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3.5 text-[13.5px] font-medium text-slate-700 outline-none focus:border-cyan-400"
                onChange={(event) => resetToFirstPage(setSearch)(event.target.value)}
                placeholder="Tìm theo mã bài, tên học sinh hoặc giáo viên…"
                type="search"
                value={search}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[
              {
                active: unassignedOnly,
                label: 'Chưa phân công',
                toggle: () => resetToFirstPage(setUnassignedOnly)(!unassignedOnly),
              },
              {
                active: overdueOnly,
                label: 'Quá hạn',
                toggle: () => resetToFirstPage(setOverdueOnly)(!overdueOnly),
              },
              {
                active: openAppealOnly,
                label: 'Có đơn phúc khảo đang mở',
                toggle: () => resetToFirstPage(setOpenAppealOnly)(!openAppealOnly),
              },
            ].map((chip) => (
              <button
                className={[
                  'rounded-full px-4 py-2 text-[13px] font-semibold transition',
                  chip.active
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                ].join(' ')}
                key={chip.label}
                onClick={chip.toggle}
                type="button"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <FilterChips
            items={ASSIGNMENT_STATUS_FILTERS}
            onChange={resetToFirstPage(setStatus)}
            value={status}
          />

          {selectedRows.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-2.5 rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-3.5">
              <span className="text-[13px] font-bold text-cyan-800">
                Đã chọn {selectedRows.length} bài
              </span>
              <button
                className="inline-flex h-9.5 items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 text-[12.5px] font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!canBulkAssign}
                onClick={() => setBulkAssignOpen(true)}
                title={canBulkAssign ? undefined : 'Chỉ gán được các bài chưa có phân công đang mở'}
                type="button"
              >
                <UserPlus className="size-4" />
                Phân công {selectableUnassigned.length} bài
              </button>
              <button
                className="inline-flex h-9.5 items-center gap-1.5 rounded-lg border border-cyan-300 bg-white px-3.5 text-[12.5px] font-bold text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                disabled={!canSetDeadline}
                onClick={() => setDeadlineOpen(true)}
                title={canSetDeadline ? undefined : 'Chỉ đặt hạn được cho bài đã có phân công'}
                type="button"
              >
                <CalendarClock className="size-4" />
                Đặt hạn chấm
              </button>
              <button
                className="inline-flex h-9.5 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3.5 text-[12.5px] font-bold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                disabled={selectedAssignmentIds.length === 0}
                onClick={() => setReclaimOpen(true)}
                type="button"
              >
                <TimerReset className="size-4" />
                Thu hồi
              </button>
              <button
                className="ml-auto text-[12.5px] font-bold text-slate-500 transition hover:text-slate-700"
                onClick={() => setSelectedIds([])}
                type="button"
              >
                Bỏ chọn
              </button>
            </div>
          ) : (stats?.overdue ?? 0) > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5">
              <AlarmClock className="size-4.5 text-amber-600" />
              <span className="flex-1 text-[13px] font-semibold text-amber-800">
                Có <b>{stats?.overdue}</b> phân công quá hạn trong phạm vi đang xem.
              </span>
              <button
                className="inline-flex h-9.5 items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 text-[12.5px] font-bold text-white transition hover:bg-amber-700"
                onClick={() => setReclaimOpen(true)}
                type="button"
              >
                <TimerReset className="size-4" />
                Thu hồi toàn bộ
              </button>
            </div>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-280 border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="w-10 px-4 py-3.5">
                      <input
                        aria-label="Chọn tất cả bài trong trang"
                        checked={rows.length > 0 && rows.every((row) => selectedIds.includes(row.candidateResultId))}
                        className="size-4 accent-cyan-600"
                        onChange={toggleAllOnPage}
                        type="checkbox"
                      />
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                      Mã bài
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                      Học sinh
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                      Trạng thái bài
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                      Vòng chấm
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                      Giáo viên chấm
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                      Hạn chấm
                    </th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-extrabold uppercase text-slate-500">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rowsQuery.isLoading ? (
                    <tr>
                      <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={8}>
                        Đang tải…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={8}>
                        Không có bài nào khớp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const assignment = getAssignmentStatusDisplay(row.assignmentStatus)
                      const result = getResultStatusDisplay(row.resultStatus)
                      const outcome = getOutcomeDisplay(row.outcome)
                      const completed = row.assignmentStatus === 'COMPLETED'
                      return (
                        <tr className="border-b border-slate-100" key={row.candidateResultId}>
                          <td className="px-4 py-3.5">
                            <input
                              aria-label={`Chọn bài ${row.resultCode}`}
                              checked={selectedIds.includes(row.candidateResultId)}
                              className="size-4 accent-cyan-600"
                              onChange={() => toggleRow(row.candidateResultId)}
                              type="checkbox"
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            <ResultCode code={row.resultCode} />
                            <div className="mt-1 flex items-center gap-1.5">
                              {row.flagged ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                                  <Flag className="size-3" />
                                  Nghi vấn
                                </span>
                              ) : null}
                              {row.hasOpenAppeal ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
                                  <Gavel className="size-3" />
                                  Có đơn
                                </span>
                              ) : null}
                            </div>
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
                                  {row.examName ? ` · ${row.examName}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge label={result.label} tone={result.tone} />
                            <div className="mt-1 text-[12px] font-bold text-slate-500">
                              Điểm {formatScore(row.totalScore)}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {row.roundType ? (
                              <div className="flex flex-col items-start gap-1">
                                <RoundBadge roundType={row.roundType} />
                                {outcome ? (
                                  <StatusBadge label={outcome.label} tone={outcome.tone} />
                                ) : (
                                  <StatusBadge label={assignment.label} tone={assignment.tone} />
                                )}
                              </div>
                            ) : (
                              <span className="text-[12.5px] font-semibold text-slate-400">
                                Chưa mở vòng nào
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {row.teacherName ? (
                              <>
                                <div className="text-[13px] font-bold text-slate-700">
                                  {row.teacherName}
                                </div>
                                <div className="text-[11px] font-medium text-slate-400">
                                  {completed
                                    ? `Xong ${formatIsoDateTime(row.completedAt)}`
                                    : `Giao ${formatIsoDateTime(row.assignedAt)}`}
                                </div>
                              </>
                            ) : (
                              <span className="text-[13px] font-semibold text-slate-400">
                                Chưa phân công
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {row.assignmentId && !completed ? (
                              <DeadlineLabel deadlineAt={row.deadlineAt} overdue={row.overdue} />
                            ) : (
                              <span className="text-[12px] font-semibold text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                aria-label={`Lịch sử điểm bài ${row.resultCode}`}
                                className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                                onClick={() => setHistoryTarget(row)}
                                title="Lịch sử điểm"
                                type="button"
                              >
                                <History className="size-4" />
                              </button>
                              {completed ? null : (
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
                  disabled={rowsQuery.isFetching || page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  type="button"
                >
                  Trước
                </button>
                <button
                  className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] font-bold text-slate-700 disabled:opacity-50"
                  disabled={rowsQuery.isFetching || page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  type="button"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {assignTarget ? (
        <AssignTeacherDialog
          currentTeacherId={assignTarget.teacherId}
          isPending={assignPending}
          onCancel={() => setAssignTarget(null)}
          onConfirm={confirmAssign}
          resultCode={assignTarget.resultCode}
          resultStatus={assignTarget.resultStatus}
          studentName={assignTarget.studentName}
        />
      ) : null}

      {bulkAssignOpen ? (
        <AssignTeacherDialog
          isPending={assignMutation.isPending}
          onCancel={() => setBulkAssignOpen(false)}
          onConfirm={confirmBulkAssign}
          resultCode={`${selectableUnassigned.length} bài đã chọn`}
          resultStatus={selectableUnassigned[0]?.resultStatus}
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

      {historyTarget ? (
        <ResultHistoryDialog
          candidateResultId={historyTarget.candidateResultId}
          onClose={() => setHistoryTarget(null)}
          resultCode={historyTarget.resultCode}
          studentName={historyTarget.studentName}
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

      {deadlineOpen ? (
        <SetDeadlineDialog
          assignmentCount={selectedAssignmentIds.length}
          isPending={deadlineMutation.isPending}
          onCancel={() => setDeadlineOpen(false)}
          onConfirm={confirmDeadline}
        />
      ) : null}

      {reclaimOpen ? (
        <ReclaimOverdueDialog
          examName={selectedExamName}
          isPending={reclaimMutation.isPending}
          onCancel={() => setReclaimOpen(false)}
          onConfirm={confirmReclaim}
          overdueCount={stats?.overdue ?? 0}
          selectedCount={selectedAssignmentIds.length}
        />
      ) : null}

      {finalizeOpen ? (
        <FinalizeExamDialog
          examName={selectedExamName}
          isLoading={finalizePreviewQuery.isLoading}
          isPending={finalizeMutation.isPending}
          onCancel={() => setFinalizeOpen(false)}
          onConfirm={confirmFinalize}
          preview={finalizePreviewQuery.data}
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
  const [roundType, setRoundType] = useState<'' | GradingRoundType>('')
  const tasksQuery = useMyGradingTasksQuery(page, PAGE_SIZE, { roundType, status })

  // Số cho thẻ thống kê là TỔNG toàn bộ (độc lập filter). Hai query size=1 chỉ để lấy
  // totalElements; enum chỉ có ASSIGNED/COMPLETED nên tổng được giao = pending + done.
  const assignedCountQuery = useMyGradingTasksQuery(1, 1, { status: 'ASSIGNED' })
  const completedCountQuery = useMyGradingTasksQuery(1, 1, { status: 'COMPLETED' })

  const pageData = tasksQuery.data
  const tasks = pageData?.content ?? []
  const totalElements = pageData?.totalElements ?? 0
  const totalPages = pageData?.totalPages ?? 0
  const pending = assignedCountQuery.data?.totalElements ?? 0
  const done = completedCountQuery.data?.totalElements ?? 0
  // Quá hạn chỉ đếm được trên trang đang xem — BE không có thẻ số riêng cho giáo viên.
  const overdueOnPage = tasks.filter((task) => task.overdue).length

  return (
    <section className="mx-auto max-w-300">
      <div>
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-cyan-700">Chấm điểm</p>
        <h1 className="mt-1.5 text-[30px] font-extrabold tracking-tight text-slate-900">
          Bài cần chấm
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] text-slate-500">
          Một hàng đợi cho cả bốn vòng chấm. Bạn chấm ẩn danh — hệ thống không hiển thị thông tin
          học sinh.
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
          icon={<AlarmClock size={19} />}
          iconTone="violet"
          label="Quá hạn (trang này)"
          value={overdueOnPage}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          aria-label="Lọc theo vòng chấm"
          className="h-11 min-w-44 rounded-lg border border-slate-200 bg-white px-3.5 text-[13.5px] font-semibold text-slate-700 outline-none focus:border-cyan-400"
          onChange={(event) => {
            setRoundType(event.target.value as '' | GradingRoundType)
            setPage(1)
          }}
          value={roundType}
        >
          {ROUND_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <FilterChips
        items={ASSIGNMENT_STATUS_FILTERS}
        onChange={(next) => {
          setStatus(next)
          setPage(1)
        }}
        value={status}
      />

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-220 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Mã bài
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Kỳ thi
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Vòng chấm
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Điểm hiện tại
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Hạn chấm
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
                  <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={7}>
                    Đang tải…
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={7}>
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
                          <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                            <Flag className="size-3" />
                            Nghi vấn
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-[13.5px] font-semibold text-slate-700">
                          {task.examName ?? '—'}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-400">
                          {task.partCount} phần · giao {formatIsoDateTime(task.assignedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <RoundBadge roundType={task.roundType} />
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-bold text-slate-600">
                        {formatScore(task.currentScore)}
                      </td>
                      <td className="px-4 py-3.5">
                        {completed ? (
                          <span className="text-[12px] font-semibold text-slate-300">—</span>
                        ) : (
                          <DeadlineLabel deadlineAt={task.deadlineAt} overdue={task.overdue} />
                        )}
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
                          {completed ? 'Xem lại' : 'Mở bài'}
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

export function TeacherGradingTaskPage() {
  const navigate = useNavigate()
  const params = useParams()
  const assignmentId = params.assignmentId ?? null

  const detailQuery = useGradingTaskDetailQuery(assignmentId)
  const detail = detailQuery.data

  const regradeMutation = useRegradeResultMutation()
  const upholdMutation = useUpholdResultMutation()
  const invalidateMutation = useInvalidateResultMutation()
  const clearInvalidMutation = useClearInvalidResultMutation()
  const declineMutation = useDeclineGradingAssignmentMutation()

  const [scores, setScores] = useState<ScoreState>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [activeItemId, setActiveItemId] = useState('')
  const [initializedFor, setInitializedFor] = useState<string | null>(null)
  const [decision, setDecision] = useState<DecisionOutcome | null>(null)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Đồng bộ state khi mở một bài khác (điều hướng trực tiếp giữa các bài).
  if (detail && detail.assignmentId !== initializedFor) {
    setScores(initialScores(detail))
    setFeedback(initialFeedback(detail))
    setActiveItemId(detail.items[0]?.paperItemId ?? '')
    setInitializedFor(detail.assignmentId)
  }

  const previewItems = useMemo<ItemGradeInput[]>(() => {
    if (!detail) {
      return []
    }
    const required = detail.criteria.filter((criterion) => criterion.required)
    return detail.items
      .filter((item) =>
        required.every((criterion) => scores[item.paperItemId]?.[criterion.id] != null),
      )
      .map((item) => ({
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
  // Chỉ tính thử khi vòng này thật sự cho chấm lại — vòng soi bài vô hiệu không có
  // REGRADED nên gọi preview ở đó chỉ tạo lỗi đỏ.
  const canRegrade = detail?.allowedOutcomes.includes('REGRADED') === true
  const previewQuery = useGradingPreviewQuery(assignmentId, debouncedPreviewItems, {
    enabled: canRegrade && detail?.editable === true,
  })

  if (detailQuery.isLoading) {
    return <PageLoader />
  }

  if (!detail) {
    return (
      <section className="mx-auto max-w-300">
        <BackButton onClick={() => navigate('/teacher/grading')} />
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-16 text-center text-sm text-slate-400">
          Không tìm thấy bài cần chấm.
        </div>
      </section>
    )
  }

  const readOnly = !detail.editable
  const roundDisplay = getRoundTypeDisplay(detail.roundType)
  const resultDisplay = getResultStatusDisplay(detail.resultStatus)
  const activeItem = detail.items.find((item) => item.paperItemId === activeItemId) ?? detail.items[0]
  const allFilled = isEveryRequiredCriterionFilled(detail, scores)
  const preview = previewQuery.data
  const previewItemScore = (paperItemId: string) =>
    preview?.itemScores.find((score) => score.paperItemId === paperItemId)?.itemScore ?? null
  const allows = (outcome: DecisionOutcome) => detail.allowedOutcomes.includes(outcome)

  function setScore(paperItemId: string, criterionId: string, value: number | null) {
    setScores((current) => ({
      ...current,
      [paperItemId]: { ...current[paperItemId], [criterionId]: value },
    }))
  }

  function backToQueue(delayMs = 900) {
    window.setTimeout(() => navigate('/teacher/grading'), delayMs)
  }

  const onActionError = (error: unknown) => {
    setDecision(null)
    setSubmitOpen(false)
    setMessage(toApiError(error).message)
  }

  function doSubmit() {
    const items: ItemGradeInput[] = detail!.items.map((item) => ({
      criterionScores: detail!.criteria
        .filter((criterion) => scores[item.paperItemId]?.[criterion.id] != null)
        .map((criterion) => ({
          rubricCriterionId: criterion.id,
          score: scores[item.paperItemId][criterion.id] as number,
        })),
      feedbackSummary: feedback[item.paperItemId] || undefined,
      paperItemId: item.paperItemId,
    }))
    regradeMutation.mutate(
      { assignmentId: detail!.assignmentId, items },
      {
        onError: onActionError,
        onSuccess: (result) => {
          setSubmitOpen(false)
          setMessage(`Đã nộp điểm. Tổng ${formatScore(result.totalScore)}.`)
          backToQueue()
        },
      },
    )
  }

  function doDecision(outcome: DecisionOutcome, reason: string) {
    const done = (text: string) => {
      setDecision(null)
      setMessage(text)
    }
    switch (outcome) {
      case 'UPHELD':
        upholdMutation.mutate(
          { assignmentId: detail!.assignmentId, reason },
          {
            onError: onActionError,
            onSuccess: () => {
              done('Đã giữ nguyên điểm bài thi.')
              backToQueue()
            },
          },
        )
        return
      case 'INVALIDATED':
        invalidateMutation.mutate(
          { assignmentId: detail!.assignmentId, reason },
          {
            onError: onActionError,
            onSuccess: () => {
              done('Đã vô hiệu bài thi.')
              backToQueue()
            },
          },
        )
        return
      case 'CLEARED_INVALID':
        clearInvalidMutation.mutate(
          { assignmentId: detail!.assignmentId, reason },
          {
            onError: onActionError,
            onSuccess: (result) => {
              done('Đã gỡ vô hiệu. Lượt chấm lần đầu đã được mở cho bạn.')
              // BE mở luôn vòng INITIAL cho chính giáo viên này — đi thẳng sang đó
              // thay vì bắt họ tìm lại bài trong hàng đợi.
              if (result.nextAssignmentId) {
                window.setTimeout(
                  () => navigate(`/teacher/grading/${result.nextAssignmentId}`),
                  900,
                )
              } else {
                backToQueue()
              }
            },
          },
        )
        return
      case 'DECLINED':
        declineMutation.mutate(
          { assignmentId: detail!.assignmentId, reason },
          {
            onError: onActionError,
            onSuccess: () => {
              done('Đã trả lại phân công.')
              backToQueue()
            },
          },
        )
    }
  }

  const decisionPending =
    upholdMutation.isPending ||
    invalidateMutation.isPending ||
    clearInvalidMutation.isPending ||
    declineMutation.isPending

  return (
    <section className="mx-auto max-w-300">
      <BackButton onClick={() => navigate('/teacher/grading')} />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-cyan-700">
            {roundDisplay.label}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <h1 className="text-[25px] font-extrabold tracking-tight text-slate-900">
              Bài #{detail.resultCode}
            </h1>
            <RoundBadge roundType={detail.roundType} />
            <StatusBadge label={resultDisplay.label} tone={resultDisplay.tone} />
          </div>
          <p className="mt-1 text-[13.5px] font-medium text-slate-500">
            {detail.examName ?? 'Kỳ thi'} · {detail.items.length} phần thi ·{' '}
            {detail.criteria.length} tiêu chí
            {detail.scoreBefore != null ? (
              <>
                {' '}
                · Điểm khi được giao{' '}
                <b className="text-slate-700">{formatScore(detail.scoreBefore)}</b>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {readOnly ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-600">
              <CircleCheck className="size-4" />
              Chỉ xem — phân công đã đóng
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700">
              <ShieldCheck className="size-4" />
              Chấm ẩn danh
            </div>
          )}
          {detail.deadlineAt && !readOnly ? (
            <DeadlineLabel deadlineAt={detail.deadlineAt} overdue={detail.overdue} />
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <Info className="mt-0.5 size-4.5 shrink-0 text-slate-400" />
        <div className="text-[12.5px] font-medium leading-relaxed text-slate-600">
          {roundDisplay.hint}
          {readOnly ? ' Bạn đang xem lại phân công đã hoàn thành.' : ''}
          {detail.currentTotalScore != null ? (
            <>
              {' '}
              Điểm đang có: <b className="text-slate-900">{formatScore(detail.currentTotalScore)}</b>
              .
            </>
          ) : null}
        </div>
      </div>

      {detail.appealReason ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex items-start gap-2.5">
            <Gavel className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div>
              <div className="text-[13.5px] font-extrabold text-red-900">
                Lý do học sinh nêu trong đơn phúc khảo
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-red-800">
                {detail.appealReason}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {detail.flagged ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-2.5">
            <Flag className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div>
              <div className="text-[13.5px] font-extrabold text-amber-900">
                Bài thi bị đánh dấu nghi vấn
              </div>
              {detail.flagReason ? (
                <p className="mt-1 text-[12.5px] leading-relaxed text-amber-800">
                  {detail.flagReason}
                </p>
              ) : null}
              <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-amber-700">
                Nghe bài rồi quyết định. Cờ chỉ thực sự được gỡ khi bạn nộp điểm hoặc giữ nguyên
                điểm — rời trang giữa chừng thì bài vẫn còn cờ.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-7">
        {detail.items.length > 1 ? (
          <TabPillGroup
            items={itemTabItems(detail.items)}
            onChange={setActiveItemId}
            value={activeItem?.paperItemId ?? ''}
          />
        ) : null}

        {(activeItem ? [activeItem] : []).map((item) => (
          <div
            className={canRegrade ? 'grid gap-4.5 lg:grid-cols-[1.15fr_1fr]' : 'grid gap-4.5'}
            key={item.paperItemId}
          >
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

              {canRegrade ? (
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
              ) : null}
            </div>

            {canRegrade ? (
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
            ) : null}
          </div>
        ))}

        {readOnly ? (
          <div className="inline-flex h-12.5 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-[15px] font-bold text-slate-500">
            <CircleCheck className="size-5" />
            Phân công đã đóng — không thao tác được nữa
          </div>
        ) : (
          <div className="grid gap-3">
            {canRegrade ? (
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
            ) : null}

            {/* Dựng đúng các nút BE cho phép ở vòng này. DECLINED không nằm trong
                allowedOutcomes vì nó hợp lệ ở MỌI vòng — luôn hiện khi còn chấm được. */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              {canRegrade ? (
                <button
                  className="inline-flex h-12.5 items-center justify-center gap-2 rounded-xl bg-cyan-600 text-[15px] font-bold text-white shadow-lg shadow-cyan-600/30 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none sm:col-span-2"
                  disabled={!allFilled || regradeMutation.isPending}
                  onClick={() => setSubmitOpen(true)}
                  type="button"
                >
                  <CircleCheck className="size-5" />
                  {allFilled
                    ? `Nộp điểm cho ${detail.items.length} phần thi`
                    : 'Chấm đủ tiêu chí bắt buộc của mọi phần để nộp'}
                </button>
              ) : null}

              {allows('UPHELD') ? (
                <button
                  className="inline-flex h-11.5 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white text-[14px] font-bold text-emerald-700 transition hover:bg-emerald-50"
                  onClick={() => setDecision('UPHELD')}
                  type="button"
                >
                  <ShieldCheck className="size-4.5" />
                  Giữ nguyên điểm
                </button>
              ) : null}

              {allows('CLEARED_INVALID') ? (
                <button
                  className="inline-flex h-11.5 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white text-[14px] font-bold text-emerald-700 transition hover:bg-emerald-50"
                  onClick={() => setDecision('CLEARED_INVALID')}
                  type="button"
                >
                  <ShieldCheck className="size-4.5" />
                  Gỡ vô hiệu
                </button>
              ) : null}

              {allows('INVALIDATED') ? (
                <button
                  className="inline-flex h-11.5 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white text-[14px] font-bold text-red-600 transition hover:bg-red-50"
                  onClick={() => setDecision('INVALIDATED')}
                  type="button"
                >
                  <ShieldAlert className="size-4.5" />
                  Kết luận vi phạm
                </button>
              ) : null}

              <button
                className="inline-flex h-11.5 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[14px] font-bold text-slate-600 transition hover:bg-slate-50"
                onClick={() => setDecision('DECLINED')}
                type="button"
              >
                <Undo2 className="size-4.5" />
                Trả lại phân công
              </button>
            </div>
          </div>
        )}
      </div>

      {decision ? (
        <GradingDecisionDialog
          flagReason={detail.flagReason}
          isPending={decisionPending}
          onCancel={() => setDecision(null)}
          onConfirm={(reason) => doDecision(decision, reason)}
          outcome={decision}
          resultCode={detail.resultCode}
          roundType={detail.roundType}
        />
      ) : null}

      {submitOpen ? (
        <SubmitGradingDialog
          flagged={detail.flagged}
          isPending={regradeMutation.isPending}
          onCancel={() => setSubmitOpen(false)}
          onConfirm={doSubmit}
          partCount={detail.items.length}
          resultBandName={preview?.resultBandName}
          resultCode={detail.resultCode}
          roundType={detail.roundType}
          scoreBefore={detail.scoreBefore ?? detail.currentTotalScore}
          totalScore={preview?.totalScore}
        />
      ) : null}

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
    </section>
  )
}
