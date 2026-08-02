import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { CircleCheck, ClipboardList, Lock, Mic, TimerReset, UserPlus } from 'lucide-react'
import { useExamQuery } from '@/features/examCore/api/queries'
import {
  FinalizeExamDialog,
  formatScore,
  getAssignmentStatusDisplay,
  getResultStatusDisplay,
  initials,
  avatarClasses,
  useFinalizeExamResultsMutation,
  useFinalizePreviewQuery,
  type GradingAssignmentStatus,
  type GradingRoundType,
  type GradingTask,
} from '@/features/grading'
import { toApiError } from '@/shared/api'
import { Pagination } from '@/shared/components/Pagination'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import {
  useClassTestGradingStatsQuery,
  useClassTestGradingTasksQuery,
} from '../api/useClassTestGradingQueries'
import { useClaimClassTestGradingMutation } from '../api/useClassTestGradingMutations'
import { ClaimGradingDialog } from '../components/ClaimGradingDialog'
import type { ClaimableRoundType } from '../types'

const PAGE_SIZE = 20

/**
 * Hàng đợi chấm của giáo viên tạo bài kiểm tra trên lớp.
 *
 * Khác hàng đợi kỳ thi tập trung ở hai chỗ, và đó là lý do hai màn không dùng chung một
 * component bảng: ở đây có cột **Học sinh** (BE chỉ trả tên/lớp cho bài trên lớp), và
 * mọi đường điều hướng bám theo `:examId` chứ không về hàng đợi toàn trường.
 */
export function ClassTestGradingQueuePage() {
  const navigate = useNavigate()
  const { examId = '' } = useParams()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'' | GradingAssignmentStatus>('')
  const [roundType, setRoundType] = useState<'' | GradingRoundType>('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [claimOpen, setClaimOpen] = useState(false)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const examQuery = useExamQuery(examId || null)
  const tasksQuery = useClassTestGradingTasksQuery(examId, page, PAGE_SIZE, { roundType, status })
  const statsQuery = useClassTestGradingStatsQuery(examId)
  const finalizePreviewQuery = useFinalizePreviewQuery(finalizeOpen && examId ? examId : null)
  const claimMutation = useClaimClassTestGradingMutation()
  const finalizeMutation = useFinalizeExamResultsMutation()

  const pageData = tasksQuery.data
  const tasks = pageData?.content ?? []
  const stats = statsQuery.data
  // Chỉ tick được dòng trong TRANG hiện tại — sang trang khác thì tick cũ không còn
  // dòng tương ứng, nên lọc lại theo `tasks` mỗi lần render.
  const selectedTasks = tasks.filter((task) => selectedIds.includes(task.candidateResultId))

  function reportError(cause: unknown) {
    setError(toApiError(cause).message)
  }

  function goToTask(task: GradingTask) {
    navigate(`/teacher/class-tests/${examId}/grading/${task.assignmentId}`)
  }

  function doClaim(round: ClaimableRoundType) {
    claimMutation.mutate(
      {
        candidateResultIds: selectedTasks.map((task) => task.candidateResultId),
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
            cho bạn tự động; hậu kiểm và soi lại bài vô hiệu thì bấm “Nhận chấm”.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-300 bg-white px-4 text-[13px] font-bold text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
            disabled={selectedTasks.length === 0}
            onClick={() => setClaimOpen(true)}
            title={selectedTasks.length === 0 ? 'Chọn bài trước khi nhận chấm' : undefined}
            type="button"
          >
            <UserPlus className="size-4" />
            Nhận chấm
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

      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3">
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
        {selectedTasks.length > 0 ? (
          <span className="ml-auto text-[13px] font-bold text-cyan-800">
            Đã chọn {selectedTasks.length} bài
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
                <th className="px-4 py-2.5">Vòng chấm</th>
                <th className="px-4 py-2.5">Trạng thái</th>
                <th className="px-4 py-2.5 text-right">Điểm</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {tasksQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-12 text-center text-[13px] text-slate-400" colSpan={6}>
                    Đang tải…
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-[13px] text-slate-400" colSpan={6}>
                    Chưa có bài nào cần bạn chấm.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const assignment = getAssignmentStatusDisplay(task.status)
                  const result = getResultStatusDisplay(task.resultStatus)
                  const completed = task.status === 'COMPLETED'
                  return (
                    <tr
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                      key={task.assignmentId}
                    >
                      <td className="py-3 pl-4">
                        <input
                          aria-label={`Chọn bài của ${task.studentName ?? task.resultCode}`}
                          checked={selectedIds.includes(task.candidateResultId)}
                          className="size-4 accent-cyan-600"
                          onChange={() =>
                            setSelectedIds((current) =>
                              current.includes(task.candidateResultId)
                                ? current.filter((id) => id !== task.candidateResultId)
                                : [...current, task.candidateResultId],
                            )
                          }
                          type="checkbox"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarClasses(task.studentName ?? task.resultCode)}`}
                          >
                            {initials(task.studentName ?? task.resultCode)}
                          </span>
                          <div className="min-w-0 leading-tight">
                            <div className="truncate text-[13px] font-bold text-slate-800">
                              {/* Bài trên lớp luôn có tên; giữ mã bài làm lưới an toàn
                                  nếu dữ liệu lớp bị thiếu. */}
                              {task.studentName ?? `Bài #${task.resultCode}`}
                            </div>
                            <div className="truncate text-[11px] font-medium text-slate-500">
                              {task.className ? `Lớp ${task.className} · ` : ''}
                              {task.partCount} câu
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge label={result.label} tone={result.tone} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge label={assignment.label} tone={assignment.tone} />
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-extrabold tabular-nums text-slate-900">
                        {formatScore(task.currentScore)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className={[
                            'inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition',
                            completed
                              ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              : 'bg-cyan-600 text-white hover:bg-cyan-700',
                          ].join(' ')}
                          onClick={() => goToTask(task)}
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
          selectedCount={selectedTasks.length}
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
