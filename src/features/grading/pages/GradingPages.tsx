import { useMemo, useState } from 'react'
import {
  AlarmClock,
  ArrowLeft,
  Bot,
  CalendarClock,
  ChevronRight,
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
import { ActionMenuButton, type ActionMenuItem } from '@/shared/ui/ActionMenuButton'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { PageLoader } from '@/shared/ui/PageLoader'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
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
import { SegmentedControl, type SegmentItem } from '../components/SegmentedControl'
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

const ASSIGNMENT_STATUS_FILTERS: SegmentItem<'' | GradingAssignmentStatus>[] = [
  { label: 'Tất cả', value: '' },
  { label: 'Đang chấm', value: 'ASSIGNED' },
  { label: 'Đã chấm xong', value: 'COMPLETED' },
]

/** Ô chọn/tìm dùng chung trong toolbar — cùng chiều cao, cùng tông nền. */
const FIELD_CLASS =
  'h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-400'

const ROUND_FILTERS: Array<{ label: string; value: '' | GradingRoundType }> = [
  { label: 'Tất cả vòng chấm', value: '' },
  { label: 'Chấm thủ công', value: 'INITIAL' },
  { label: 'Hậu kiểm', value: 'SPOT_CHECK' },
  { label: 'Xét vô hiệu', value: 'REMEDIATION' },
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

const ADMIN_TABS: SegmentItem[] = [
  { label: 'Điều phối chấm bài', value: 'board' },
  { label: 'Chất lượng AI', value: 'ai' },
]

function ResultCode({ code }: { code: string }) {
  return (
    <span className="inline-flex h-5.5 items-center rounded-md border border-slate-200 bg-slate-50 px-2 font-mono text-xs font-bold tracking-wide text-slate-900">
      #{code}
    </span>
  )
}

/** Tiêu đề trang: eyebrow + h1 + mô tả, dùng chung một thang chữ cho cả ba trang. */
function PageHeading({
  children,
  eyebrow,
  title,
}: {
  children?: React.ReactNode
  eyebrow: string
  title: string
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">{eyebrow}</p>
      <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
      {children ? <p className="mt-1.5 max-w-2xl text-[13px] text-slate-500">{children}</p> : null}
    </div>
  )
}

/** Cột "Thao tác": nút chính + menu ⋯ cho các hành động phụ. */
function RowActions({
  children,
  menu,
  resultCode,
}: {
  children?: React.ReactNode
  menu: ActionMenuItem[]
  resultCode: string
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {children}
      <ActionMenuButton ariaLabel={`Thao tác khác cho bài ${resultCode}`} items={menu} />
    </div>
  )
}

function RoundBadge({ roundType }: { roundType: GradingRoundType | null | undefined }) {
  const display = getRoundTypeDisplay(roundType)
  return <StatusBadge label={display.label} tone={display.tone} />
}

/** Nhãn hạn chấm; quá hạn thì đỏ. `overdue` do BE tính, FE không tự so giờ. */
function DeadlineLabel({ deadlineAt, overdue }: { deadlineAt?: string | null; overdue: boolean }) {
  if (!deadlineAt) {
    return <span className="text-[11px] font-medium text-slate-400">Chưa đặt hạn</span>
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] tabular-nums ${
        overdue ? 'font-bold text-red-600' : 'font-semibold text-slate-500'
      }`}
    >
      {overdue ? <AlarmClock className="size-3" /> : <CalendarClock className="size-3" />}
      {overdue ? 'Quá hạn ' : 'Hạn '}
      {formatIsoDateTime(deadlineAt)}
    </span>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="mb-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-700"
      onClick={onClick}
      type="button"
    >
      <ArrowLeft className="size-4" />
      Quay lại danh sách
    </button>
  )
}

/** Tab theo từng phần thi: value là paperItemId, nhãn lấy partLabel (thiếu thì "Phần N"). */
function itemTabItems(items: GradingTaskItem[]): SegmentItem[] {
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

  // Chỉ `Phân công tự động` ở lại làm nút chính; ba hành động còn lại vào menu ⋯ để
  // header không còn là một hàng bốn nút cạnh nhau tranh nhau sự chú ý.
  const headerMenuItems: ActionMenuItem[] = [
    { icon: RefreshCw, id: 'refresh', label: 'Làm mới', onSelect: () => rowsQuery.refetch() },
    {
      disabled: exportMutation.isPending,
      icon: Download,
      id: 'export',
      label: 'Xuất bảng điểm',
      onSelect: () =>
        exportMutation.mutate(
          { examId: examId || undefined, examName: selectedExamName },
          { onError: errorToast, onSuccess: () => setMessage('Đã tải bảng điểm CSV.') },
        ),
    },
    {
      disabled: !examId,
      disabledReason: 'Chọn kỳ thi trước khi chốt sổ',
      icon: Lock,
      id: 'finalize',
      label: 'Chốt sổ kỳ thi',
      onSelect: () => setFinalizeOpen(true),
      tone: 'warning',
    },
  ]

  return (
    <section className="mx-auto grid max-w-320 gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading eyebrow="Chấm điểm" title="Điều phối chấm bài">
          Giao bài cho giáo viên ở bốn vòng chấm:{' '}
          <b className="font-semibold text-slate-700">chấm thủ công</b> bài AI không đủ tự tin,{' '}
          <b className="font-semibold text-slate-700">hậu kiểm</b> bài đã công bố,{' '}
          <b className="font-semibold text-slate-700">xét lại</b> bài bị vô hiệu và{' '}
          <b className="font-semibold text-slate-700">phúc khảo</b> theo đơn học sinh.
        </PageHeading>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-600 px-4 text-[13px] font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            // BE bắt buộc phạm vi: phân công tự động luôn chạy trong một kỳ thi hoặc ca thi.
            disabled={!examId}
            onClick={() => setAutoAssignOpen(true)}
            title={examId ? undefined : 'Chọn kỳ thi trước khi phân công tự động'}
            type="button"
          >
            <UsersRound className="size-4" />
            Phân công tự động
          </button>
          <ActionMenuButton ariaLabel="Thao tác khác cho kỳ thi" items={headerMenuItems} />
        </div>
      </div>

      <SegmentedControl ariaLabel="Khu vực" items={ADMIN_TABS} onChange={setTab} value={tab} />

      {tab === 'ai' ? (
        <AiQualityPanel examId={examId || undefined} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              hint="trong phạm vi đang xem"
              icon={<Inbox size={19} />}
              iconTone="slate"
              label="Tổng số bài"
              value={stats?.total ?? '-'}
            />
            {/* Hai thẻ dưới đây kiêm luôn bộ lọc — thay cho hàng chip riêng trước đây. */}
            <StatCard
              active={unassignedOnly}
              hint={unassignedOnly ? 'Đang lọc theo nhóm này' : 'Bấm để chỉ xem nhóm này'}
              icon={<UserPlus size={19} />}
              iconTone="amber"
              label="Chưa phân công"
              onClick={() => resetToFirstPage(setUnassignedOnly)(!unassignedOnly)}
              value={stats?.unassigned ?? '-'}
            />
            <StatCard
              hint="đã giao, chờ giáo viên nộp"
              icon={<ClipboardList size={19} />}
              iconTone="violet"
              label="Đang chấm"
              value={stats?.assigned ?? '-'}
            />
            <StatCard
              active={overdueOnly}
              hint={overdueOnly ? 'Đang lọc theo nhóm này' : 'Bấm để chỉ xem nhóm này'}
              icon={<AlarmClock size={19} />}
              iconTone="red"
              label="Quá hạn"
              onClick={() => resetToFirstPage(setOverdueOnly)(!overdueOnly)}
              value={stats?.overdue ?? '-'}
            />
          </div>

          {/* Dải đếm theo trạng thái + tiến độ giáo viên gập lại: hữu ích nhưng không phải
              thứ cần xem mỗi lần vào trang, và mở sẵn thì đẩy bảng xuống dưới màn hình đầu. */}
          {stats && (stats.byResultStatus.length > 0 || stats.teacherProgress.length > 0) ? (
            <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-[13px] font-bold text-slate-700">
                <ChevronRight className="size-4 text-slate-400 transition group-open:rotate-90" />
                <span className="flex-1">Chi tiết tiến độ</span>
                <span className="text-[11px] font-medium text-slate-400">
                  {stats.byResultStatus.length} trạng thái bài · {stats.teacherProgress.length} giáo
                  viên
                </span>
              </summary>

              <div className="grid gap-4 px-5 pb-5">
                {stats.byResultStatus.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Theo trạng thái bài
                    </span>
                    {stats.byResultStatus.map((entry) => {
                      const display = getResultStatusDisplay(entry.status)
                      return (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                          key={entry.status}
                        >
                          {display.label}
                          <b className="font-extrabold tabular-nums text-slate-900">{entry.count}</b>
                        </span>
                      )
                    })}
                  </div>
                ) : null}

                {stats.teacherProgress.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <Scale className="size-3.5" />
                      Tiến độ theo giáo viên
                    </div>
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {stats.teacherProgress.map((teacher) => {
                        const name = teacher.teacherName ?? 'Không rõ'
                        return (
                          <div
                            className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5"
                            key={teacher.teacherId}
                          >
                            <span
                              className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarClasses(name)}`}
                            >
                              {initials(name)}
                            </span>
                            <div className="min-w-0 leading-tight">
                              <div className="truncate text-[13px] font-bold text-slate-800">
                                {name}
                              </div>
                              <div className="text-[11px] font-medium tabular-nums text-slate-400">
                                {teacher.assigned} đang chấm · {teacher.completed} xong
                                {teacher.overdue > 0 ? (
                                  <span className="font-bold text-red-600">
                                    {' '}
                                    · {teacher.overdue} quá hạn
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </details>
          ) : null}

          {/* Toàn bộ bộ lọc trong MỘT thanh: trước đây trải ra ba hàng với ba kiểu chip khác nhau. */}
          <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3">
            <select
              aria-label="Lọc theo kỳ thi"
              className={`${FIELD_CLASS} min-w-48`}
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
              className={`${FIELD_CLASS} min-w-40`}
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
              className={`${FIELD_CLASS} min-w-40`}
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

            <span aria-hidden="true" className="hidden h-6 w-px bg-slate-200 sm:block" />

            <button
              aria-pressed={openAppealOnly}
              className={[
                'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition',
                openAppealOnly
                  ? 'bg-cyan-600 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50',
              ].join(' ')}
              onClick={() => resetToFirstPage(setOpenAppealOnly)(!openAppealOnly)}
              type="button"
            >
              <Gavel className="size-3.5" />
              Có đơn phúc khảo đang mở
            </button>

            <div className="relative min-w-52 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-700 outline-none focus:border-cyan-400"
                onChange={(event) => resetToFirstPage(setSearch)(event.target.value)}
                placeholder="Tìm theo mã bài, tên học sinh hoặc giáo viên…"
                type="search"
                value={search}
              />
            </div>
          </div>

          {selectedRows.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">
              <span className="text-[13px] font-bold text-cyan-800">
                Đã chọn {selectedRows.length} bài
              </span>
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 text-xs font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!canBulkAssign}
                onClick={() => setBulkAssignOpen(true)}
                title={canBulkAssign ? undefined : 'Chỉ gán được các bài chưa có phân công đang mở'}
                type="button"
              >
                <UserPlus className="size-4" />
                Phân công {selectableUnassigned.length} bài
              </button>
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-cyan-300 bg-white px-3.5 text-xs font-bold text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                disabled={!canSetDeadline}
                onClick={() => setDeadlineOpen(true)}
                title={canSetDeadline ? undefined : 'Chỉ đặt hạn được cho bài đã có phân công'}
                type="button"
              >
                <CalendarClock className="size-4" />
                Đặt hạn chấm
              </button>
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3.5 text-xs font-bold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                disabled={selectedAssignmentIds.length === 0}
                onClick={() => setReclaimOpen(true)}
                type="button"
              >
                <TimerReset className="size-4" />
                Thu hồi
              </button>
              <button
                className="ml-auto text-xs font-bold text-slate-500 underline underline-offset-2 transition hover:text-slate-700"
                onClick={() => setSelectedIds([])}
                type="button"
              >
                Bỏ chọn
              </button>
            </div>
          ) : (stats?.overdue ?? 0) > 0 ? (
            <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlarmClock className="size-4 text-amber-600" />
              <span className="flex-1 text-[13px] font-medium text-amber-800">
                Có <b className="font-extrabold tabular-nums">{stats?.overdue}</b> phân công quá hạn
                trong phạm vi đang xem.
              </span>
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                onClick={() => setReclaimOpen(true)}
                type="button"
              >
                <TimerReset className="size-4" />
                Thu hồi toàn bộ
              </button>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <SegmentedControl
                ariaLabel="Trạng thái phân công"
                items={ASSIGNMENT_STATUS_FILTERS}
                onChange={resetToFirstPage(setStatus)}
                value={status}
              />
              <span className="ml-auto text-xs font-medium text-slate-500">
                <b className="font-extrabold tabular-nums text-slate-900">{totalElements}</b> bài
                khớp bộ lọc
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-200 border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="w-9 py-2.5 pl-4">
                      <input
                        aria-label="Chọn tất cả bài trong trang"
                        checked={rows.length > 0 && rows.every((row) => selectedIds.includes(row.candidateResultId))}
                        className="size-4 accent-cyan-600"
                        onChange={toggleAllOnPage}
                        type="checkbox"
                      />
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Bài thi
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Trạng thái &amp; vòng chấm
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Người chấm &amp; hạn
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Điểm
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rowsQuery.isLoading ? (
                    <tr>
                      <td className="px-5 py-12 text-center text-[13px] text-slate-400" colSpan={6}>
                        Đang tải…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td className="px-5 py-12 text-center text-[13px] text-slate-400" colSpan={6}>
                        Không có bài nào khớp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const assignment = getAssignmentStatusDisplay(row.assignmentStatus)
                      const result = getResultStatusDisplay(row.resultStatus)
                      const outcome = getOutcomeDisplay(row.outcome)
                      const completed = row.assignmentStatus === 'COMPLETED'
                      // Lịch sử điểm + gỡ phân công chuyển vào menu ⋯ để mỗi dòng chỉ còn
                      // MỘT nút nổi bật — trước đây ba nút cạnh nhau trên mọi dòng.
                      const rowMenu: ActionMenuItem[] = [
                        {
                          icon: History,
                          id: 'history',
                          label: 'Lịch sử điểm',
                          onSelect: () => setHistoryTarget(row),
                        },
                        ...(row.assignmentId && !completed
                          ? [
                              {
                                icon: Trash2,
                                id: 'remove',
                                label: 'Gỡ phân công',
                                onSelect: () => setRemoveTarget(row),
                                tone: 'danger' as const,
                              },
                            ]
                          : []),
                      ]
                      return (
                        <tr
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                          key={row.candidateResultId}
                        >
                          <td className="py-3 pl-4">
                            <input
                              aria-label={`Chọn bài ${row.resultCode}`}
                              checked={selectedIds.includes(row.candidateResultId)}
                              className="size-4 accent-cyan-600"
                              onChange={() => toggleRow(row.candidateResultId)}
                              type="checkbox"
                            />
                          </td>

                          {/* Mã bài + cờ + học sinh + lớp + kỳ thi — trước đây là hai cột riêng. */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarClasses(row.studentName ?? '?')}`}
                              >
                                {initials(row.studentName ?? '?')}
                              </span>
                              <div className="min-w-0 leading-tight">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <ResultCode code={row.resultCode} />
                                  {row.flagged ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                                      <Flag className="size-3" />
                                      Nghi vấn
                                    </span>
                                  ) : null}
                                  {row.hasOpenAppeal ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                                      <Gavel className="size-3" />
                                      Có đơn
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1 truncate text-[13px] font-semibold text-slate-900">
                                  {row.studentName ?? '—'}
                                </div>
                                <div className="truncate text-[11px] font-medium text-slate-400">
                                  {row.className ? `Lớp ${row.className}` : 'Chưa xếp lớp'}
                                  {row.examName ? ` · ${row.examName}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Trạng thái bài + vòng chấm + kết quả vòng, xếp ngang một hàng. */}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <StatusBadge label={result.label} tone={result.tone} />
                              {row.roundType ? (
                                <>
                                  <RoundBadge roundType={row.roundType} />
                                  {outcome ? (
                                    <StatusBadge label={outcome.label} tone={outcome.tone} />
                                  ) : (
                                    <StatusBadge label={assignment.label} tone={assignment.tone} />
                                  )}
                                </>
                              ) : (
                                <span className="text-[11px] font-medium text-slate-400">
                                  Chưa mở vòng nào
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Giáo viên + hạn chấm — trước đây là hai cột riêng. */}
                          <td className="px-4 py-3">
                            {row.teacherName ? (
                              <div className="grid gap-0.5 leading-tight">
                                <div className="text-[13px] font-semibold text-slate-900">
                                  {row.teacherName}
                                </div>
                                {row.assignmentId && !completed ? (
                                  <DeadlineLabel deadlineAt={row.deadlineAt} overdue={row.overdue} />
                                ) : null}
                                <div className="text-[11px] font-medium tabular-nums text-slate-400">
                                  {completed
                                    ? `Xong ${formatIsoDateTime(row.completedAt)}`
                                    : `Giao ${formatIsoDateTime(row.assignedAt)}`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[13px] font-medium text-slate-400">
                                Chưa phân công
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <span
                              className={
                                row.totalScore == null
                                  ? 'text-sm font-medium text-slate-400'
                                  : 'text-sm font-extrabold tabular-nums text-slate-900'
                              }
                            >
                              {formatScore(row.totalScore)}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <RowActions menu={rowMenu} resultCode={row.resultCode}>
                              {completed ? null : (
                                <button
                                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 text-xs font-bold text-white transition hover:bg-cyan-700"
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
                              )}
                            </RowActions>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-2.5">
              <span className="text-xs font-medium text-slate-500">
                <b className="font-extrabold tabular-nums text-slate-900">{totalElements}</b> bài ·
                trang {totalPages ? page : 0}/{totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  disabled={rowsQuery.isFetching || page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  type="button"
                >
                  Trước
                </button>
                <button
                  className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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
    <section className="mx-auto grid max-w-300 gap-5">
      <PageHeading eyebrow="Chấm điểm" title="Bài cần chấm">
        Một hàng đợi cho cả bốn vòng chấm. Bạn chấm ẩn danh — hệ thống không hiển thị thông tin học
        sinh.
      </PageHeading>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          hint="tổng, không phụ thuộc bộ lọc"
          icon={<Headphones size={19} />}
          iconTone="amber"
          label="Cần chấm"
          value={pending}
        />
        <StatCard
          hint="tổng, không phụ thuộc bộ lọc"
          icon={<CircleCheck size={19} />}
          iconTone="emerald"
          label="Đã chấm xong"
          value={done}
        />
        <StatCard
          hint="chỉ đếm trên trang đang xem"
          icon={<AlarmClock size={19} />}
          iconTone="red"
          label="Quá hạn (trang này)"
          value={overdueOnPage}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* Hai bộ lọc gộp vào đầu bảng thay vì hai hàng rời phía trên. */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <SegmentedControl
            ariaLabel="Trạng thái phân công"
            items={ASSIGNMENT_STATUS_FILTERS}
            onChange={(next) => {
              setStatus(next)
              setPage(1)
            }}
            value={status}
          />
          <select
            aria-label="Lọc theo vòng chấm"
            className={`${FIELD_CLASS} min-w-40`}
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
          <span className="ml-auto text-xs font-medium text-slate-500">
            <b className="font-extrabold tabular-nums text-slate-900">{totalElements}</b> bài khớp bộ
            lọc
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-180 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Bài thi
                </th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Vòng chấm
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Điểm hiện tại
                </th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Hạn &amp; trạng thái
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {tasksQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-12 text-center text-[13px] text-slate-400" colSpan={5}>
                    Đang tải…
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-[13px] text-slate-400" colSpan={5}>
                    Chưa có bài nào được giao cho bạn.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const completed = task.status === 'COMPLETED'
                  const display = getAssignmentStatusDisplay(task.status)
                  return (
                    <tr
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                      key={task.assignmentId}
                    >
                      {/* Mã bài + cờ + kỳ thi + số phần + mốc giao — trước đây là hai cột. */}
                      <td className="px-4 py-3">
                        <div className="grid gap-1 leading-tight">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <ResultCode code={task.resultCode} />
                            {task.flagged ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                                <Flag className="size-3" />
                                Nghi vấn
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[13px] font-semibold text-slate-900">
                            {task.examName ?? '—'}
                          </div>
                          <div className="text-[11px] font-medium tabular-nums text-slate-400">
                            {task.partCount} phần · giao {formatIsoDateTime(task.assignedAt)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoundBadge roundType={task.roundType} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={
                            task.currentScore == null
                              ? 'text-sm font-medium text-slate-400'
                              : 'text-sm font-extrabold tabular-nums text-slate-900'
                          }
                        >
                          {formatScore(task.currentScore)}
                        </span>
                      </td>
                      {/* Hạn chấm + trạng thái phân công — trước đây là hai cột. */}
                      <td className="px-4 py-3">
                        <div className="grid justify-items-start gap-1">
                          {completed ? (
                            <span className="text-[11px] font-medium text-slate-400">—</span>
                          ) : (
                            <DeadlineLabel deadlineAt={task.deadlineAt} overdue={task.overdue} />
                          )}
                          <StatusBadge label={display.label} tone={display.tone} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className={[
                            'inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition',
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

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-2.5">
          <span className="text-xs font-medium text-slate-500">
            <b className="font-extrabold tabular-nums text-slate-900">{totalElements}</b> bài · trang{' '}
            {totalPages ? page : 0}/{totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              disabled={tasksQuery.isFetching || page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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
  // Chỉ tính thử khi vòng này thật sự cho chấm lại — vòng xét vô hiệu không có
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
              done('Đã gỡ vô hiệu. Lượt chấm thủ công đã được mở cho bạn.')
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
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">
            {roundDisplay.label}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Bài #{detail.resultCode}
            </h1>
            <RoundBadge roundType={detail.roundType} />
            <StatusBadge label={resultDisplay.label} tone={resultDisplay.tone} />
          </div>
          <p className="mt-1.5 text-xs font-medium text-slate-500">
            {detail.examName ?? 'Kỳ thi'} · {detail.items.length} phần thi ·{' '}
            {detail.criteria.length} tiêu chí
            {detail.scoreBefore != null ? (
              <>
                {' '}
                · Điểm khi được giao{' '}
                <b className="font-bold tabular-nums text-slate-900">
                  {formatScore(detail.scoreBefore)}
                </b>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {readOnly ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              <CircleCheck className="size-3.5" />
              Chỉ xem — phân công đã đóng
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
              <ShieldCheck className="size-3.5" />
              Chấm ẩn danh
            </span>
          )}
          {detail.deadlineAt && !readOnly ? (
            <DeadlineLabel deadlineAt={detail.deadlineAt} overdue={detail.overdue} />
          ) : null}
        </div>
      </div>

      {/* Một thẻ ngữ cảnh thay cho tối đa ba banner full-width xếp dọc: hint vòng chấm là
          dòng chính, lý do phúc khảo và cờ nghi vấn thành các dòng nền màu bên trong. */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start gap-2.5 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-slate-400" />
          <div className="text-[13px] leading-relaxed text-slate-600">
            {roundDisplay.hint}
            {readOnly ? ' Bạn đang xem lại phân công đã hoàn thành.' : ''}
            {detail.currentTotalScore != null ? (
              <>
                {' '}
                Điểm đang có:{' '}
                <b className="font-bold tabular-nums text-slate-900">
                  {formatScore(detail.currentTotalScore)}
                </b>
                .
              </>
            ) : null}
          </div>
        </div>

        {detail.appealReason ? (
          <div className="flex items-start gap-2.5 border-t border-red-200 bg-red-50 px-4 py-3">
            <Gavel className="mt-0.5 size-4 shrink-0 text-red-600" />
            <div>
              <div className="text-[13px] font-bold text-red-900">
                Lý do học sinh nêu trong đơn phúc khảo
              </div>
              <p className="mt-1 text-xs leading-relaxed text-red-800">{detail.appealReason}</p>
            </div>
          </div>
        ) : null}

        {detail.flagged ? (
          <div className="flex items-start gap-2.5 border-t border-amber-200 bg-amber-50 px-4 py-3">
            <Flag className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <div className="text-[13px] font-bold text-amber-900">
                Bài thi bị đánh dấu nghi vấn
              </div>
              {detail.flagReason ? (
                <p className="mt-1 text-xs leading-relaxed text-amber-800">{detail.flagReason}</p>
              ) : null}
              <p className="mt-1.5 text-xs leading-relaxed text-amber-700">
                Nghe bài rồi quyết định. Cờ chỉ thực sự được gỡ khi bạn nộp điểm hoặc giữ nguyên
                điểm — rời trang giữa chừng thì bài vẫn còn cờ.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4">
        {detail.items.length > 1 ? (
          <SegmentedControl
            ariaLabel="Phần thi"
            items={itemTabItems(detail.items)}
            onChange={setActiveItemId}
            value={activeItem?.paperItemId ?? ''}
          />
        ) : null}

        {(activeItem ? [activeItem] : []).map((item) => (
          <div
            className={canRegrade ? 'grid items-start gap-4 lg:grid-cols-[1.15fr_1fr]' : 'grid gap-4'}
            key={item.paperItemId}
          >
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Mic className="size-4 text-cyan-700" />
                    Bản ghi bài nói · {item.partLabel ?? 'Phần thi'}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {item.turns.length} lượt
                  </span>
                </div>
                <div className="mt-3.5">
                  <GradingTurnList turns={item.turns} />
                </div>
                <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5">
                  <Bot className="size-4 text-violet-600" />
                  <span className="flex-1 text-xs font-semibold text-violet-700">
                    Điểm của bản chấm hiện tại
                  </span>
                  <span className="text-[13px] font-extrabold tabular-nums text-violet-700">
                    {formatScore(item.currentItemScore)}
                  </span>
                </div>
              </div>

              {canRegrade ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <ClipboardList className="size-4 text-cyan-700" />
                    Nhận xét · {item.partLabel ?? 'Phần thi'}
                  </div>
                  <textarea
                    aria-label={`Nhận xét cho ${item.partLabel ?? 'phần thi'}`}
                    className="mt-3 min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13px] leading-relaxed text-slate-700 outline-none focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
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
              <div className="grid gap-3">
                {/* Viền thường + số lớn, không còn viền cyan đậm + gradient: điểm phần
                    không nên tranh sự chú ý với tổng điểm ở thanh dưới. */}
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
                  <div>
                    <div className="text-[13px] font-bold text-cyan-700">
                      Điểm phần · {item.partLabel ?? 'Phần thi'}
                    </div>
                    <div className="text-[11px] font-medium text-slate-400">
                      Hệ thống tính theo trọng số tiêu chí
                    </div>
                  </div>
                  <div className="text-[30px] font-extrabold leading-none tabular-nums text-cyan-700">
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
      </div>

      {readOnly ? (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-3.5 text-[13px] font-bold text-slate-500">
          <CircleCheck className="size-4" />
          Phân công đã đóng — không thao tác được nữa
        </div>
      ) : (
        /* Thanh dính đáy: tổng điểm tạm tính + đúng các nút BE cho phép, để giáo viên
           không phải cuộn xuống hết trang mới thao tác được. */
        <div className="sticky bottom-0 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_-6px_20px_rgb(15_23_42/0.07)]">
          {canRegrade ? (
            <div className="flex items-center gap-3 border-slate-200 pr-3.5 sm:border-r">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Tổng điểm cả bài (tạm tính)
                </div>
                <div className="text-[11px] font-medium text-slate-400">
                  {previewQuery.isFetching
                    ? 'Đang tính lại…'
                    : allFilled
                      ? 'Hệ thống tính từ điểm tiêu chí bạn nhập'
                      : 'Phần chưa chấm đang dùng điểm hiện tại'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[28px] font-extrabold leading-none tabular-nums text-emerald-600">
                  {formatScore(preview?.totalScore)}
                </div>
                {preview?.resultBandName ? (
                  <div className="text-[11px] font-bold text-emerald-700">
                    {preview.resultBandName}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* DECLINED không nằm trong allowedOutcomes vì nó hợp lệ ở MỌI vòng — luôn hiện
              khi còn chấm được. */}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50"
              onClick={() => setDecision('DECLINED')}
              type="button"
            >
              <Undo2 className="size-4" />
              Trả lại phân công
            </button>

            {allows('INVALIDATED') ? (
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-3.5 text-[13px] font-bold text-red-600 transition hover:bg-red-50"
                onClick={() => setDecision('INVALIDATED')}
                type="button"
              >
                <ShieldAlert className="size-4" />
                Kết luận vi phạm
              </button>
            ) : null}

            {allows('CLEARED_INVALID') ? (
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-3.5 text-[13px] font-bold text-emerald-700 transition hover:bg-emerald-50"
                onClick={() => setDecision('CLEARED_INVALID')}
                type="button"
              >
                <ShieldCheck className="size-4" />
                Gỡ vô hiệu
              </button>
            ) : null}

            {allows('UPHELD') ? (
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-3.5 text-[13px] font-bold text-emerald-700 transition hover:bg-emerald-50"
                onClick={() => setDecision('UPHELD')}
                type="button"
              >
                <ShieldCheck className="size-4" />
                Giữ nguyên điểm
              </button>
            ) : null}

            {canRegrade ? (
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-[13px] font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!allFilled || regradeMutation.isPending}
                onClick={() => setSubmitOpen(true)}
                type="button"
              >
                <CircleCheck className="size-4" />
                {allFilled
                  ? `Nộp điểm cho ${detail.items.length} phần thi`
                  : 'Chấm đủ tiêu chí bắt buộc của mọi phần để nộp'}
              </button>
            ) : null}
          </div>
        </div>
      )}

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
