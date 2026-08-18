import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  CircleCheck,
  ClipboardList,
  FileSpreadsheet,
  Lock,
  Mic,
  TimerReset,
  UserPlus,
} from 'lucide-react'
import { useAppSelector } from '@/app/store/hooks'
import { useExamQuery } from '@/features/examCore/api/queries'
import {
  FinalizeExamDialog,
  SegmentedControl,
  formatAttemptLabel,
  formatScore,
  getAssignmentStatusDisplay,
  getResultStatusDisplay,
  initials,
  avatarClasses,
  useExportExamScoresExcelMutation,
  useFinalizeExamResultsMutation,
  useFinalizePreviewQuery,
  type GradingAssignmentRow,
  type GradingAssignmentStatus,
  type GradingRoundType,
  type GradingTask,
  type ExamCandidateResultStatus,
} from '@/features/grading'
import {
  ProctoringAlertCountBadge,
  useExamProctoringAlertCountsQuery,
} from '@/features/proctoring-alerts'
import { toApiError } from '@/shared/api'
import { Pagination } from '@/shared/components/Pagination'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import {
  useClassTestGradingResultsQuery,
  useClassTestGradingStatsQuery,
  useClassTestGradingTasksQuery,
} from '../api/useClassTestGradingQueries'
import { useClaimClassTestGradingMutation } from '../api/useClassTestGradingMutations'
import { ClaimGradingDialog } from '../components/ClaimGradingDialog'
import type { ClaimableRoundType } from '../types'

const PAGE_SIZE = 20

/** Hai chế độ xem: mọi bài của lớp, hoặc riêng những bài mình đang giữ. */
type QueueMode = 'all' | 'mine'

/**
 * Dòng bảng đã chuẩn hoá.
 *
 * Hai chế độ đọc từ hai query khác nhau (`classTestGradingResults` trả bài,
 * `myClassTestGradingTasks` trả phân công) nên phải gộp về một hình dạng trước khi
 * render — nếu không thì mỗi ô lại phải hỏi "đang ở chế độ nào".
 */
type QueueRow = {
  assignmentId?: string | null
  assignmentStatus?: GradingAssignmentStatus | null
  attemptCount: number
  attemptNo: number
  candidateResultId: string
  className?: string | null
  /** Dòng phụ dưới tên: số câu phải chấm, hoặc ai đang chấm bài này. */
  note: string
  resultCode: string
  resultStatus?: ExamCandidateResultStatus | null
  score?: number | null
  /** Khoá để tra số cảnh báo giám sát của bài này. */
  sessionId?: string | null
  studentName?: string | null
}

/** Bài đang có phân công MỞ thì không nhận chấm lại được — BE cũng chặn bằng unique index. */
function isClaimable(row: QueueRow): boolean {
  return row.assignmentStatus !== 'ASSIGNED'
}

function fromTask(task: GradingTask): QueueRow {
  return {
    assignmentId: task.assignmentId,
    assignmentStatus: task.status,
    attemptCount: task.attemptCount,
    attemptNo: task.attemptNo,
    candidateResultId: task.candidateResultId,
    className: task.className,
    note: `${task.partCount} câu`,
    resultCode: task.resultCode,
    resultStatus: task.resultStatus,
    score: task.currentScore,
    sessionId: task.sessionId,
    studentName: task.studentName,
  }
}

function fromResult(row: GradingAssignmentRow): QueueRow {
  return {
    assignmentId: row.assignmentId,
    assignmentStatus: row.assignmentStatus,
    attemptCount: row.attemptCount,
    attemptNo: row.attemptNo,
    candidateResultId: row.candidateResultId,
    className: row.className,
    note:
      row.assignmentStatus === 'ASSIGNED'
        ? `Đang chấm: ${row.teacherName ?? 'bạn'}`
        : 'Chưa nhận chấm',
    resultCode: row.resultCode,
    resultStatus: row.resultStatus,
    score: row.totalScore,
    sessionId: row.sessionId,
    studentName: row.studentName,
  }
}

/**
 * Hàng đợi chấm của giáo viên tạo bài kiểm tra trên lớp.
 *
 * Khác hàng đợi kỳ thi tập trung ở hai chỗ, và đó là lý do hai màn không dùng chung một
 * component bảng: ở đây có cột **Học sinh** (BE chỉ trả tên/lớp cho bài trên lớp), và
 * mọi đường điều hướng bám theo `:examId` chứ không về hàng đợi toàn trường.
 *
 * Chế độ **"Tất cả bài"** là mặc định vì hàng đợi phân công KHÔNG phải là danh sách đầy
 * đủ: bài AI chấm sạch đi thẳng sang RELEASED nên không được mở phân công tự động, và
 * một học sinh thi lại thì lượt sau thường rơi đúng vào diện đó. Chỉ liệt kê phân công
 * là những lượt ấy biến mất khỏi màn chấm, không có đường nào nhận chấm.
 */
export function ClassTestGradingQueuePage() {
  const navigate = useNavigate()
  const { examId = '' } = useParams()
  const [mode, setMode] = useState<QueueMode>('all')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'' | GradingAssignmentStatus>('')
  const [roundType, setRoundType] = useState<'' | GradingRoundType>('')
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [claimOpen, setClaimOpen] = useState(false)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentUserId = useAppSelector((state) => state.auth.user?.userId)

  const examQuery = useExamQuery(examId || null)
  const resultsQuery = useClassTestGradingResultsQuery(examId, page, PAGE_SIZE, { unassignedOnly })
  const tasksQuery = useClassTestGradingTasksQuery(examId, page, PAGE_SIZE, { roundType, status })
  const statsQuery = useClassTestGradingStatsQuery(examId)
  const alertCountsQuery = useExamProctoringAlertCountsQuery(examId || null)
  const finalizePreviewQuery = useFinalizePreviewQuery(finalizeOpen && examId ? examId : null)
  const claimMutation = useClaimClassTestGradingMutation()
  const finalizeMutation = useFinalizeExamResultsMutation()
  const exportExcelMutation = useExportExamScoresExcelMutation()

  const activeQuery = mode === 'all' ? resultsQuery : tasksQuery
  const pageData = activeQuery.data
  const rows: QueueRow[] = useMemo(() => {
    if (mode === 'all') {
      return (resultsQuery.data?.content ?? []).map(fromResult)
    }
    return (tasksQuery.data?.content ?? []).map(fromTask)
  }, [mode, resultsQuery.data, tasksQuery.data])
  const stats = statsQuery.data

  // Chỉ tick được dòng trong TRANG hiện tại — sang trang khác thì tick cũ không còn
  // dòng tương ứng, nên lọc lại theo `rows` mỗi lần render.
  const selectedRows = rows.filter(
    (row) => selectedIds.includes(row.candidateResultId) && isClaimable(row),
  )

  function switchMode(next: QueueMode) {
    setMode(next)
    setPage(1)
    setSelectedIds([])
  }

  function reportError(cause: unknown) {
    setError(toApiError(cause).message)
  }

  function goToTask(row: QueueRow) {
    navigate(`/teacher/class-tests/${examId}/grading/${row.assignmentId}`)
  }

  function doClaim(round: ClaimableRoundType) {
    claimMutation.mutate(
      {
        candidateResultIds: selectedRows.map((row) => row.candidateResultId),
        examId,
        roundType: round,
      },
      {
        onError: reportError,
        onSuccess: (ids) => {
          setClaimOpen(false)
          setSelectedIds([])
          setMessage(`Đã nhận chấm ${ids.length} bài.`)
        },
      },
    )
  }

  /**
   * File xuất ra bám theo chế độ đang xem, không phải lúc nào cũng là toàn bộ bài.
   *
   * `kind: 'CLASS_TEST'` là bắt buộc: bỏ trống thì BE hiểu là kỳ thi tập trung và file về
   * rỗng. Ở chế độ "Bài tôi đang chấm" phải kèm `teacherId` — không có nó thì nhãn nút nói
   * một đằng còn file lại là bảng điểm của cả lớp.
   */
  function doExportExcel() {
    exportExcelMutation.mutate(
      {
        assignmentStatus: mode === 'mine' ? status : '',
        examId,
        examName: examQuery.data?.name,
        kind: 'CLASS_TEST',
        roundType: mode === 'mine' ? roundType : '',
        teacherId: mode === 'mine' ? currentUserId : undefined,
        unassignedOnly: mode === 'all' && unassignedOnly,
      },
      {
        onError: reportError,
        onSuccess: () => setMessage('Đã tải bảng điểm Excel.'),
      },
    )
  }

  function doFinalize(releasePendingWithAiScores: boolean) {
    finalizeMutation.mutate(
      { examId, releasePendingWithAiScores },
      {
        onError: reportError,
        onSuccess: (count) => {
          setFinalizeOpen(false)
          setMessage(`Đã chốt sổ ${count} kết quả của bài kiểm tra.`)
        },
      },
    )
  }

  return (
    <section className="mx-auto grid max-w-300 gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">
            Chấm bài kiểm tra trên lớp
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
            {examQuery.data?.name ?? 'Bài kiểm tra trên lớp'}
          </h1>
          <p className="mt-1.5 text-xs font-medium text-slate-500">
            Bạn là giáo viên tạo bài này nên đảm nhận chấm toàn bộ. Bài AI không đủ tự tin được giao
            cho bạn tự động; những bài còn lại — kể cả lượt thi lại — chọn rồi bấm “Nhận chấm”.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-300 bg-white px-4 text-[13px] font-bold text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
            disabled={selectedRows.length === 0}
            onClick={() => setClaimOpen(true)}
            title={selectedRows.length === 0 ? 'Chọn bài chưa nhận chấm trước' : undefined}
            type="button"
          >
            <UserPlus className="size-4" />
            Nhận chấm
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
            disabled={!examId || exportExcelMutation.isPending}
            onClick={doExportExcel}
            type="button"
          >
            <FileSpreadsheet className="size-4" />
            {exportExcelMutation.isPending ? 'Đang xuất…' : 'Xuất Excel'}
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 text-[13px] font-bold text-white transition hover:bg-amber-700"
            onClick={() => setFinalizeOpen(true)}
            type="button"
          >
            <Lock className="size-4" />
            Chốt sổ
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<ClipboardList className="size-4" />}
          iconTone="indigo"
          label="Tổng bài"
          value={stats?.total ?? 0}
        />
        <StatCard
          icon={<Mic className="size-4" />}
          iconTone="violet"
          label="Đang chờ chấm"
          value={stats?.assigned ?? 0}
        />
        <StatCard
          icon={<CircleCheck className="size-4" />}
          iconTone="emerald"
          label="Chưa phân công"
          value={stats?.unassigned ?? 0}
        />
        <StatCard
          icon={<TimerReset className="size-4" />}
          iconTone="amber"
          label="Quá hạn"
          value={stats?.overdue ?? 0}
        />
      </div>

      <SegmentedControl<QueueMode>
        ariaLabel="Phạm vi danh sách"
        items={[
          { label: 'Tất cả bài', value: 'all' },
          { label: 'Bài tôi đang chấm', value: 'mine' },
        ]}
        onChange={switchMode}
        value={mode}
      />

      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3">
        {mode === 'all' ? (
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              checked={unassignedOnly}
              className="size-4 accent-cyan-600"
              onChange={(event) => {
                setUnassignedOnly(event.target.checked)
                setPage(1)
              }}
              type="checkbox"
            />
            Chỉ bài chưa nhận chấm
          </label>
        ) : (
          <>
            <select
              aria-label="Vòng chấm"
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none focus:border-cyan-400"
              onChange={(event) => {
                setRoundType(event.target.value as '' | GradingRoundType)
                setPage(1)
              }}
              value={roundType}
            >
              <option value="">Mọi vòng chấm</option>
              <option value="INITIAL">Chấm lần đầu</option>
              <option value="SPOT_CHECK">Hậu kiểm</option>
              <option value="REMEDIATION">Soi lại bài vô hiệu</option>
              <option value="APPEAL">Phúc khảo</option>
            </select>
            <select
              aria-label="Trạng thái phân công"
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none focus:border-cyan-400"
              onChange={(event) => {
                setStatus(event.target.value as '' | GradingAssignmentStatus)
                setPage(1)
              }}
              value={status}
            >
              <option value="">Mọi trạng thái</option>
              <option value="ASSIGNED">Đang chấm</option>
              <option value="COMPLETED">Đã chốt</option>
            </select>
          </>
        )}
        {selectedRows.length > 0 ? (
          <span className="ml-auto text-[13px] font-bold text-cyan-800">
            Đã chọn {selectedRows.length} bài
          </span>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-200 text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="w-9 py-2.5 pl-4" />
                <th className="px-4 py-2.5">Học sinh</th>
                <th className="px-4 py-2.5">Trạng thái bài</th>
                <th className="px-4 py-2.5">Phân công</th>
                <th className="px-4 py-2.5 text-right">Điểm</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {activeQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-12 text-center text-[13px] text-slate-400" colSpan={6}>
                    Đang tải…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-[13px] text-slate-400" colSpan={6}>
                    {mode === 'all'
                      ? 'Chưa có bài nào của bài kiểm tra này.'
                      : 'Chưa có bài nào cần bạn chấm.'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const assignment = getAssignmentStatusDisplay(row.assignmentStatus)
                  const result = getResultStatusDisplay(row.resultStatus)
                  const attemptLabel = formatAttemptLabel(row.attemptNo, row.attemptCount)
                  const claimable = isClaimable(row)
                  const completed = row.assignmentStatus === 'COMPLETED'
                  return (
                    <tr
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                      key={row.candidateResultId}
                    >
                      <td className="py-3 pl-4">
                        <input
                          aria-label={`Chọn bài của ${row.studentName ?? row.resultCode}`}
                          checked={selectedIds.includes(row.candidateResultId)}
                          className="size-4 accent-cyan-600"
                          // Bài đang có người chấm không nhận lại được; khoá ở đây để
                          // giáo viên không chọn rồi mới ăn lỗi từ BE.
                          disabled={!claimable}
                          onChange={() =>
                            setSelectedIds((current) =>
                              current.includes(row.candidateResultId)
                                ? current.filter((id) => id !== row.candidateResultId)
                                : [...current, row.candidateResultId],
                            )
                          }
                          type="checkbox"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarClasses(row.studentName ?? row.resultCode)}`}
                          >
                            {initials(row.studentName ?? row.resultCode)}
                          </span>
                          <div className="min-w-0 leading-tight">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-[13px] font-bold text-slate-800">
                                {/* Bài trên lớp luôn có tên; giữ mã bài làm lưới an toàn
                                    nếu dữ liệu lớp bị thiếu. */}
                                {row.studentName ?? `Bài #${row.resultCode}`}
                              </span>
                              {/* Một em thi lại có nhiều dòng trùng tên — không có nhãn
                                  này thì không biết đang chấm lượt nào. */}
                              {attemptLabel ? (
                                <span className="shrink-0 rounded-md bg-cyan-50 px-1.5 py-0.5 text-[10.5px] font-bold text-cyan-700">
                                  {attemptLabel}
                                </span>
                              ) : null}
                              {/* Bài trên lớp mặc định bật giám sát đầy đủ lúc tạo, nên nó sinh ra
                                  cảnh báo y như kỳ thi tập trung -- mà trước đây hàng đợi này không
                                  hiển thị chúng ở đâu cả. */}
                              <ProctoringAlertCountBadge
                                counts={row.sessionId ? alertCountsQuery.data?.get(row.sessionId) : undefined}
                              />
                            </div>
                            <div className="truncate text-[11px] font-medium text-slate-500">
                              {row.className ? `Lớp ${row.className} · ` : ''}
                              {row.note}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge label={result.label} tone={result.tone} />
                      </td>
                      <td className="px-4 py-3">
                        {row.assignmentStatus ? (
                          <StatusBadge label={assignment.label} tone={assignment.tone} />
                        ) : (
                          <span className="text-[12px] font-medium text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-extrabold tabular-nums text-slate-900">
                        {formatScore(row.score)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.assignmentId ? (
                          <button
                            className={[
                              'inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition',
                              completed
                                ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                : 'bg-cyan-600 text-white hover:bg-cyan-700',
                            ].join(' ')}
                            onClick={() => goToTask(row)}
                            type="button"
                          >
                            <Mic className="size-4" />
                            {completed ? 'Xem lại' : 'Mở bài'}
                          </button>
                        ) : (
                          <span className="text-[12px] font-medium text-slate-400">
                            Chọn để nhận chấm
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-2.5">
          <Pagination
            currentPage={page}
            itemName="bài"
            onPageChange={setPage}
            totalElements={pageData?.totalElements ?? 0}
            totalPages={pageData?.totalPages ?? 0}
          />
        </div>
      </div>

      {claimOpen ? (
        <ClaimGradingDialog
          isPending={claimMutation.isPending}
          onCancel={() => setClaimOpen(false)}
          onConfirm={doClaim}
          selectedCount={selectedRows.length}
        />
      ) : null}

      {finalizeOpen ? (
        <FinalizeExamDialog
          examName={examQuery.data?.name}
          isPending={finalizeMutation.isPending}
          onCancel={() => setFinalizeOpen(false)}
          onConfirm={doFinalize}
          preview={finalizePreviewQuery.data}
        />
      ) : null}

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />
    </section>
  )
}
