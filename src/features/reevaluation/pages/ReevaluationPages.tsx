import { useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock4,
  Download,
  EyeOff,
  FileUp,
  Headphones,
  History,
  Inbox,
  Info,
  Loader,
  Mail,
  MailCheck,
  MessageSquare,
  Mic,
  Minus,
  Plus,
  RefreshCw,
  UserCheck,
  UserMinus,
  Users,
  UsersRound,
  X,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { PageLoader } from '@/shared/ui/PageLoader'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { DetailHeaderCard } from '@/shared/ui/DetailHeaderCard'
import { FilterChips } from '@/shared/ui/FilterChips'
import { toApiError } from '@/shared/api'
import {
  useAppealQuery,
  useAppealReviewersQuery,
  useAppealsQuery,
  useAppealStatsQuery,
  useAppealTaskDetailQuery,
  useMyAppealTasksQuery,
} from '../api/useReevaluationQueries'
import {
  useApproveMutation,
  useAssignMutation,
  usePublishMutation,
  useRejectMutation,
  useRemoveReviewerMutation,
  useSubmitReportMutation,
  type ItemReportInput,
} from '../api/useReevaluationMutations'
import { AiScoreBars } from '../components/AiScoreBars'
import { ApproveDialog } from '../components/ApproveDialog'
import { CompareTable } from '../components/CompareTable'
import { CriteriaScoreCard } from '../components/CriteriaScoreCard'
import { ProcessTimeline } from '../components/ProcessTimeline'
import { PublishDialog } from '../components/PublishDialog'
import { RejectDialog } from '../components/RejectDialog'
import { RemoveReviewerDialog } from '../components/RemoveReviewerDialog'
import { ReviewerPickerCard } from '../components/ReviewerPickerCard'
import { TurnList } from '../components/TurnList'
import {
  avatarClasses,
  avgScore,
  bandRound,
  buildTimeline,
  formatIsoDate,
  formatIsoDateTime,
  formatScore,
  getAppealStatusDisplay,
  initials,
  partLabelsText,
  reviewerItemsForItem,
  suggestedPartScore,
  suggestedScoreForItem,
  type AppealDetail,
  type AppealItem,
  type AppealReviewer,
  type AppealStatus,
  type AppealTaskDetail,
} from '../types'

const PAGE_SIZE = 20

const STATUS_FILTERS: Array<{ label: string; value: '' | AppealStatus }> = [
  { label: 'Tất cả', value: '' },
  { label: 'Chờ duyệt', value: 'PENDING' },
  { label: 'Chờ phân công', value: 'APPROVED' },
  { label: 'Đang chấm lại', value: 'GRADING' },
  { label: 'Chờ đối chiếu', value: 'COMPARING' },
  { label: 'Đã công bố', value: 'PUBLISHED' },
  { label: 'Từ chối', value: 'REJECTED' },
]

const ACTION_LABEL: Record<AppealStatus, string> = {
  PENDING: 'Xem & duyệt',
  APPROVED: 'Phân công',
  GRADING: 'Theo dõi',
  COMPARING: 'Đối chiếu',
  PUBLISHED: 'Xem kết quả',
  REJECTED: 'Xem lý do',
}

function StudentCell({ name, sub }: { name: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`inline-flex size-9.5 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${avatarClasses(name)}`}
      >
        {initials(name)}
      </span>
      <div className="leading-tight">
        <div className="text-sm font-bold text-slate-900">{name}</div>
        <div className="text-xs font-semibold text-slate-400">{sub}</div>
      </div>
    </div>
  )
}

function OverdueBadge() {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[10.5px] font-bold text-red-600">
      <Clock4 className="size-3" />
      Quá hạn
    </span>
  )
}

// ============================= School Admin: List =============================

export function SchoolAdminReevaluationPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'' | AppealStatus>('')
  const [page, setPage] = useState(1)
  const appealsQuery = useAppealsQuery(page, PAGE_SIZE, { status })
  const statsQuery = useAppealStatsQuery()

  const pageData = appealsQuery.data
  const rows = pageData?.content ?? []
  const totalPages = pageData?.totalPages ?? 0
  const totalElements = pageData?.totalElements ?? 0

  function changeStatus(next: '' | AppealStatus) {
    setStatus(next)
    setPage(1)
  }

  return (
    <section className="mx-auto max-w-300">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-cyan-700">Phúc khảo</p>
          <h1 className="mt-1.5 text-[30px] font-extrabold tracking-tight text-slate-900">
            Yêu cầu phúc khảo
          </h1>
          <p className="mt-1.5 max-w-xl text-[15px] text-slate-500">
            Tiếp nhận, duyệt và điều phối các yêu cầu chấm lại bài thi nói của học sinh trong trường.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13.5px] font-bold text-slate-600 transition hover:bg-slate-50"
            onClick={() => appealsQuery.refetch()}
            type="button"
          >
            <RefreshCw className="size-4" />
            Làm mới
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13.5px] font-bold text-slate-600 transition hover:bg-slate-50"
            type="button"
          >
            <Download className="size-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Inbox size={19} />}
          iconTone="amber"
          label="Chờ duyệt"
          value={statsQuery.data?.pending ?? '-'}
        />
        <StatCard
          icon={<Loader size={19} />}
          iconTone="violet"
          label="Đang xử lý"
          value={statsQuery.data?.processing ?? '-'}
        />
        <StatCard
          icon={<CircleCheck size={19} />}
          iconTone="emerald"
          label="Đã công bố"
          value={statsQuery.data?.published ?? '-'}
        />
        <StatCard
          icon={<CircleX size={19} />}
          iconTone="indigo"
          label="Từ chối"
          value={statsQuery.data?.rejected ?? '-'}
        />
      </div>

      <FilterChips items={STATUS_FILTERS} onChange={changeStatus} value={status} />

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-200 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Học sinh
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Kỳ thi · Phần thi
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Điểm gốc
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Trạng thái
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Hạn xử lý
                </th>
                <th className="px-5 py-3.5 text-right text-[11px] font-extrabold uppercase text-slate-500">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {appealsQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={6}>
                    Đang tải…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={6}>
                    Không có yêu cầu phù hợp.
                  </td>
                </tr>
              ) : (
                rows.map((request) => {
                  const display = getAppealStatusDisplay(request.status)
                  return (
                    <tr
                      className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                      key={request.id}
                      onClick={() => navigate(`/school-admin/reevaluation/${request.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <StudentCell
                          name={request.studentName}
                          sub={request.className ? `Lớp ${request.className}` : 'Chưa xếp lớp'}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-[13.5px] font-semibold text-slate-700">
                          {request.examName}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-400">
                          {partLabelsText(request.partLabels)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex h-7.5 min-w-11 items-center justify-center rounded-lg bg-slate-100 px-2.5 text-sm font-extrabold text-slate-700">
                          {formatScore(request.originalScore)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge label={display.label} tone={display.tone} />
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-500">
                        <div>{formatIsoDate(request.deadline)}</div>
                        {request.overdue ? <OverdueBadge /> : null}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-[13px] font-bold text-cyan-700">
                          {ACTION_LABEL[request.status]}
                          <ChevronRight className="size-4" />
                        </span>
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
            <b className="text-slate-900">{totalElements}</b> yêu cầu · trang{' '}
            {totalPages ? page : 0}/{totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] font-bold text-slate-700 disabled:opacity-50"
              disabled={appealsQuery.isFetching || page <= 1}
              onClick={() => setPage((p) => p - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] font-bold text-slate-700 disabled:opacity-50"
              disabled={appealsQuery.isFetching || page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
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

// ============================= School Admin: Detail =============================

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

function CardShell({
  children,
  icon,
  title,
  right,
}: {
  children: ReactNode
  icon: ReactNode
  title: string
  right?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
          {icon}
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function DetailPanel({
  detail,
  onOpenApprove,
  onOpenReject,
  toast,
}: {
  detail: AppealDetail
  onOpenApprove: () => void
  onOpenReject: () => void
  toast: (message: string) => void
}) {
  const display = getAppealStatusDisplay(detail.status)
  const publishedReviewers = detail.reviewers.filter((r) => r.done && r.items.length > 0)
  const suggestedPart = suggestedPartScore(detail.reviewers)
  const partLabels = detail.items.map((item) => item.partLabel ?? 'Phần thi')
  const removeMutation = useRemoveReviewerMutation()
  const [pendingRemove, setPendingRemove] = useState<AppealReviewer | null>(null)

  function confirmRemove(reviewer: AppealReviewer) {
    removeMutation.mutate(
      { id: detail.id, reviewerId: reviewer.reviewerId },
      {
        onError: (error) => {
          setPendingRemove(null)
          toast(toApiError(error).message)
        },
        onSuccess: () => {
          setPendingRemove(null)
          toast('Đã gỡ giám khảo khỏi đơn phúc khảo.')
        },
      },
    )
  }

  return (
    <>
      <DetailHeaderCard
        actions={
          detail.status === 'PENDING' ? (
            <>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-red-200 bg-white px-4.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                onClick={onOpenReject}
                type="button"
              >
                <X className="size-4.5" />
                Từ chối
              </button>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700"
                onClick={onOpenApprove}
                type="button"
              >
                <CircleCheck className="size-4.5" />
                Duyệt &amp; phân công
              </button>
            </>
          ) : undefined
        }
        metaItems={[
          {
            icon: <Users className="size-3.5" />,
            label: detail.className ? `Lớp ${detail.className}` : 'Chưa xếp lớp',
          },
          {
            icon: <CalendarClock className="size-3.5" />,
            label: `Gửi ${formatIsoDateTime(detail.requestedAt)}`,
          },
          { icon: <Clock4 className="size-3.5" />, label: `Hạn ${formatIsoDateTime(detail.deadline)}` },
        ]}
        statusLabel={display.label}
        statusTone={display.tone}
        title={detail.studentName}
      />

      <div className="mt-4.5 grid gap-4.5 lg:grid-cols-[1.7fr_1fr]">
        <div className="grid gap-4.5">
          {detail.overdue ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-bold text-red-700">
              <Clock4 className="size-4" />
              Đơn đã quá hạn xử lý
            </div>
          ) : null}

          {detail.status === 'PUBLISHED' && detail.finalScore != null ? (
            <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-white px-6 py-5">
              <div className="text-center">
                <div className="text-[11.5px] font-bold text-slate-400">ĐIỂM TỔNG GỐC</div>
                <div className="text-3xl font-extrabold text-slate-400 line-through">
                  {formatScore(detail.originalScore)}
                </div>
              </div>
              <ArrowRight className="size-6 text-emerald-600" />
              <div className="text-center">
                <div className="text-[11.5px] font-bold text-emerald-600">KẾT QUẢ CÔNG BỐ</div>
                <div className="text-4xl font-extrabold text-emerald-600">
                  {formatScore(detail.finalScore)}
                </div>
                <div className="text-[10.5px] font-semibold text-emerald-600/70">
                  điểm tổng cả bài
                </div>
              </div>
              <div className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-bold text-emerald-600">
                <MailCheck className="size-4.5" />
                Đã thông báo học sinh
              </div>
            </div>
          ) : null}

          {detail.status === 'PUBLISHED' ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <Info className="mt-0.5 size-4.5 shrink-0 text-amber-600" />
              <div className="text-[12.5px] font-medium leading-relaxed text-amber-800">
                <b>{formatScore(suggestedPart)}</b> là điểm chấm lại trung bình của{' '}
                <b>riêng {partLabelsText(partLabels)}</b>. Còn{' '}
                <b>{formatScore(detail.finalScore)}</b> ở trên là <b>điểm tổng của cả bài</b> sau
                phúc khảo — hệ thống tính lại từ tất cả các phần, nên hai con số này không bằng nhau.
              </div>
            </div>
          ) : null}

          {detail.status === 'PUBLISHED' && publishedReviewers.length > 0 ? (
            <div className="grid gap-2.5">
              {detail.items.map((item) => {
                const itemSuggested = suggestedScoreForItem(detail.reviewers, item.appealItemId)
                return (
                  <div className="grid gap-2.5" key={item.appealItemId}>
                    <CompareTable item={item} reviewers={publishedReviewers} />
                    {itemSuggested != null ? (
                      <div className="flex items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                        <span className="text-[12.5px] font-bold text-cyan-700">
                          Điểm chấm lại {item.partLabel ?? 'phần thi'} (giám khảo đề xuất)
                        </span>
                        <span className="inline-flex h-8 min-w-12 items-center justify-center rounded-lg bg-white px-3 text-lg font-extrabold text-cyan-700">
                          {formatScore(itemSuggested)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}

          <CardShell
            icon={<MessageSquare className="size-4.5 text-cyan-700" />}
            title="Lý do phúc khảo"
          >
            <div className="mt-3 rounded-xl border-l-2 border-cyan-500 bg-slate-50 px-4 py-3.5 text-sm italic leading-relaxed text-slate-700">
              “{detail.reason}”
            </div>
            <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 px-3.5 py-3">
                <div className="text-[11.5px] font-semibold text-slate-400">Kỳ thi</div>
                <div className="mt-0.5 text-[13.5px] font-bold text-slate-700">{detail.examName}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3.5 py-3">
                <div className="text-[11.5px] font-semibold text-slate-400">
                  Phần thi ({detail.items.length})
                </div>
                <div className="mt-0.5 text-[13.5px] font-bold text-slate-700">
                  {partLabelsText(partLabels)}
                </div>
              </div>
            </div>
          </CardShell>

          {detail.items.map((item) => (
            <CardShell
              icon={<Bot className="size-4.5 text-violet-600" />}
              key={item.appealItemId}
              right={
                <span className="inline-flex h-9 min-w-13 items-center justify-center rounded-lg bg-violet-50 px-3 text-lg font-extrabold text-violet-700">
                  {formatScore(bandRound(avgScore(item.baselineScores)))}
                </span>
              }
              title={`Điểm hiện hành · ${item.partLabel ?? 'Phần thi'}`}
            >
              <AiScoreBars scores={item.baselineScores} />
            </CardShell>
          ))}

          {detail.status === 'GRADING' ? (
            <CardShell
              icon={<UsersRound className="size-4.5 text-violet-600" />}
              title="Tiến độ chấm lại"
            >
              <div className="mt-3.5 grid gap-2.5">
                {detail.reviewers.map((reviewer, index) => (
                  <div
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
                    key={reviewer.reviewerId}
                  >
                    <span
                      className={[
                        'inline-flex size-9 shrink-0 items-center justify-center rounded-lg',
                        reviewer.done
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-violet-50 text-violet-600',
                      ].join(' ')}
                    >
                      {reviewer.done ? (
                        <CircleCheck className="size-4.5" />
                      ) : (
                        <Loader className="size-4.5" />
                      )}
                    </span>
                    <div className="flex-1">
                      <div className="text-[13.5px] font-bold text-slate-700">
                        {reviewer.reviewerName || `Người chấm ${index + 1}`}
                      </div>
                      <div className="text-[11.5px] font-medium text-slate-400">chấm độc lập</div>
                    </div>
                    <StatusBadge
                      label={reviewer.done ? 'Đã nộp báo cáo' : 'Đang chấm lại'}
                      tone={reviewer.done ? 'success' : 'violet'}
                    />
                    {!reviewer.done && detail.reviewers.length > 1 ? (
                      <button
                        aria-label="Gỡ giám khảo"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        disabled={removeMutation.isPending}
                        onClick={() => setPendingRemove(reviewer)}
                        type="button"
                      >
                        <UserMinus className="size-4" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardShell>
          ) : null}
        </div>

        <div className="self-start rounded-2xl border border-slate-200 bg-white p-5.5">
          <div className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
            <History className="size-4.5 text-cyan-700" />
            Lịch sử xử lý
          </div>
          <ProcessTimeline events={buildTimeline(detail)} />
        </div>
      </div>

      {pendingRemove ? (
        <RemoveReviewerDialog
          isPending={removeMutation.isPending}
          onCancel={() => setPendingRemove(null)}
          onConfirm={() => confirmRemove(pendingRemove)}
          reviewerName={pendingRemove.reviewerName || 'giám khảo này'}
        />
      ) : null}
    </>
  )
}

function AssignPanel({
  detail,
  toast,
}: {
  detail: AppealDetail
  toast: (message: string) => void
}) {
  const reviewersQuery = useAppealReviewersQuery()
  const assignMutation = useAssignMutation()
  const [picked, setPicked] = useState<string[]>([])

  function togglePick(id: string) {
    setPicked((current) => {
      if (current.includes(id)) {
        return current.filter((value) => value !== id)
      }
      if (current.length >= 5) {
        return current
      }
      return [...current, id]
    })
  }

  function confirmAssign() {
    if (picked.length < 1) {
      return
    }
    assignMutation.mutate(
      { id: detail.id, reviewerIds: picked },
      {
        onError: (error) => toast(toApiError(error).message),
        onSuccess: () => {
          setPicked([])
          toast(`Đã phân công ${picked.length} giám khảo chấm lại.`)
        },
      },
    )
  }

  return (
    <>
      <div className="mb-2">
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-cyan-700">Phân công</p>
        <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight text-slate-900">
          Phân công giám khảo chấm lại
        </h1>
        <p className="mt-1.5 text-[15px] text-slate-500">
          Yêu cầu của <b className="text-slate-700">{detail.studentName}</b>
          {detail.className ? ` · Lớp ${detail.className}` : ''} · {detail.examName}
        </p>
      </div>

      <div className="mt-4 grid gap-4.5 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <EyeOff className="mt-0.5 size-5 shrink-0 text-blue-700" />
            <span className="text-[12.5px] font-medium leading-relaxed text-blue-700">
              Chọn <b>1–5 giám khảo</b> chấm lại độc lập. Danh tính giám khảo được ẩn danh với học
              sinh để đảm bảo khách quan (blind re-evaluation).
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(reviewersQuery.data ?? []).map((reviewer) => (
              <ReviewerPickerCard
                key={reviewer.id}
                onToggle={() => togglePick(reviewer.id)}
                reviewer={reviewer}
                selected={picked.includes(reviewer.id)}
              />
            ))}
          </div>
        </div>

        <div className="self-start rounded-2xl border border-slate-200 bg-white p-5.5">
          <div className="text-[13px] font-extrabold text-slate-900">Đã chọn</div>
          <div className="mt-3.5 flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold leading-none text-cyan-600">
              {picked.length}
            </span>
            <span className="text-lg font-bold text-slate-300">/ 5 giám khảo</span>
          </div>
          <div className="mt-4 grid gap-2">
            <LegendDot className="bg-emerald-500" label="Tải nhẹ (0–1 bài)" />
            <LegendDot className="bg-amber-500" label="Tải vừa (2 bài)" />
            <LegendDot className="bg-red-500" label="Tải nặng (≥3 bài)" />
          </div>
          <button
            className={[
              'mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14.5px] font-bold text-white transition',
              picked.length >= 1
                ? 'bg-cyan-600 shadow-lg shadow-cyan-600/30 hover:bg-cyan-700'
                : 'cursor-not-allowed bg-slate-300',
            ].join(' ')}
            disabled={picked.length < 1 || assignMutation.isPending}
            onClick={confirmAssign}
            type="button"
          >
            <UserCheck className="size-4.5" />
            Xác nhận phân công
          </button>
          <p className="mt-3 text-center text-[11.5px] font-medium leading-snug text-slate-400">
            Sau khi phân công, giám khảo sẽ nhận bài trong mục “Chấm phúc khảo”.
          </p>
        </div>
      </div>
    </>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
      <span className={`size-2.5 rounded-full ${className}`} />
      {label}
    </div>
  )
}

function ComparePanel({
  detail,
  toast,
}: {
  detail: AppealDetail
  toast: (message: string) => void
}) {
  const publishMutation = usePublishMutation()
  const suggested = suggestedPartScore(detail.reviewers) ?? 0
  // Điểm admin tự chỉnh, theo từng phần thi; thiếu khoá nào thì dùng điểm đề xuất của phần đó.
  const [partScores, setPartScores] = useState<Record<string, number>>({})
  const [publishOpen, setPublishOpen] = useState(false)
  // Tạm khóa chỉnh điểm sau khi đã có điểm giám khảo: công bố đúng điểm đề xuất.
  const scoreLocked = true
  const { scoringScaleMin, scoringScaleMax } = detail
  const done = detail.reviewers.filter((r) => r.done && r.items.length > 0)

  const clampToScale = (value: number) =>
    Math.max(scoringScaleMin, Math.min(scoringScaleMax, value))

  function effectiveScoreFor(item: AppealItem): number {
    const override = partScores[item.appealItemId]
    if (override != null) {
      return override
    }
    return suggestedScoreForItem(detail.reviewers, item.appealItemId) ?? 0
  }

  function setScoreFor(item: AppealItem, value: number) {
    setPartScores((current) => ({ ...current, [item.appealItemId]: clampToScale(value) }))
  }

  function adjust(item: AppealItem, delta: number) {
    setScoreFor(item, Number((effectiveScoreFor(item) + delta).toFixed(2)))
  }

  // Kẹp lần cuối theo thang rubric: điểm đề xuất đã qua bandRound (bậc 0.5) nên có thể
  // vượt trần nếu thang không nằm trên bậc 0.5 — BE sẽ từ chối mà admin đang bị khoá.
  const publishItems = detail.items.map((item) => ({
    appealItemId: item.appealItemId,
    partLabel: item.partLabel,
    partScore: clampToScale(effectiveScoreFor(item)),
  }))

  function doPublish() {
    publishMutation.mutate(
      // BE bắt buộc nhập điểm cho ĐỦ mọi phần thi của đơn, không nhận nộp thiếu.
      {
        id: detail.id,
        itemScores: publishItems.map(({ appealItemId, partScore }) => ({
          appealItemId,
          partScore,
        })),
      },
      {
        onError: (error) => {
          setPublishOpen(false)
          toast(toApiError(error).message)
        },
        onSuccess: () => {
          setPublishOpen(false)
          toast('Đã công bố kết quả phúc khảo và thông báo học sinh.')
        },
      },
    )
  }

  return (
    <>
      <div className="mb-2">
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-cyan-700">Đối chiếu</p>
        <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight text-slate-900">
          So sánh &amp; công bố kết quả
        </h1>
        <p className="mt-1.5 text-[15px] text-slate-500">
          <b className="text-slate-700">{detail.studentName}</b>
          {detail.className ? ` · Lớp ${detail.className}` : ''} · {detail.examName} ·{' '}
          {partLabelsText(detail.items.map((item) => item.partLabel ?? 'Phần thi'))}
        </p>
      </div>

      <div className="mt-4 grid gap-4.5 lg:grid-cols-[1.7fr_1fr]">
        <div className="grid gap-4.5">
          {detail.items.map((item) => (
            <div className="grid gap-3" key={item.appealItemId}>
              <CompareTable item={item} reviewers={done} />
              <div className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
                <MessageSquare className="size-4.5 text-cyan-700" />
                Nhận xét của giám khảo · {item.partLabel ?? 'Phần thi'}
              </div>
              {reviewerItemsForItem(done, item.appealItemId).map(
                ({ reviewer, item: report }, index) => {
                  const displayName = reviewer.reviewerName || `Người chấm ${index + 1}`
                  return (
                    <div
                      className="rounded-2xl border border-slate-200 bg-white p-4.5"
                      key={reviewer.reviewerId}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${avatarClasses(displayName)}`}
                        >
                          {initials(displayName)}
                        </span>
                        <div className="flex-1">
                          <div className="text-[13.5px] font-bold text-slate-900">{displayName}</div>
                          <div className="text-[11.5px] font-medium text-slate-400">
                            Điểm đề xuất cho phần này
                          </div>
                        </div>
                        <span className="inline-flex h-8.5 min-w-12 items-center justify-center rounded-lg bg-cyan-50 px-3 text-[17px] font-extrabold text-cyan-700">
                          {formatScore(report.suggestedScore)}
                        </span>
                      </div>
                      {report.note ? (
                        <p className="mt-2.5 text-[13px] leading-relaxed text-slate-600">
                          {report.note}
                        </p>
                      ) : null}
                    </div>
                  )
                },
              )}
            </div>
          ))}
        </div>

        <div className="self-start rounded-2xl border-2 border-cyan-500 bg-white p-5.5">
          <div className="text-[13px] font-extrabold text-slate-900">Quyết định cuối cùng</div>
          <div className="mt-4 flex justify-between gap-2.5">
            <ScoreChip
              className="bg-cyan-50 text-cyan-700"
              label="ĐỀ XUẤT (TB)"
              value={suggested}
            />
          </div>
          <div className="mt-4.5 text-xs font-bold text-slate-500">
            Điểm công bố từng phần thi{' '}
            <span className="font-semibold text-slate-400">
              (thang {formatScore(scoringScaleMin)}–{formatScore(scoringScaleMax)})
            </span>
          </div>
          {detail.items.map((item) => (
            <div className="mt-3" key={item.appealItemId}>
              <div className="text-[12px] font-bold text-slate-600">
                {item.partLabel ?? 'Phần thi'}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  aria-label={`Giảm điểm ${item.partLabel ?? 'phần thi'}`}
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={scoreLocked}
                  onClick={() => adjust(item, -0.25)}
                  type="button"
                >
                  <Minus className="size-4.5" />
                </button>
                <input
                  className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-0 py-2 text-center text-2xl font-extrabold text-emerald-600 outline-none disabled:cursor-not-allowed"
                  disabled={scoreLocked}
                  max={scoringScaleMax}
                  min={scoringScaleMin}
                  onChange={(event) => {
                    const next = Number(event.target.value)
                    if (event.target.value === '' || Number.isNaN(next)) {
                      return
                    }
                    setScoreFor(item, next)
                  }}
                  step={0.25}
                  type="number"
                  value={effectiveScoreFor(item)}
                />
                <button
                  aria-label={`Tăng điểm ${item.partLabel ?? 'phần thi'}`}
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={scoreLocked}
                  onClick={() => adjust(item, 0.25)}
                  type="button"
                >
                  <Plus className="size-4.5" />
                </button>
              </div>
            </div>
          ))}
          <button
            className="mt-4.5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[14.5px] font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700"
            onClick={() => setPublishOpen(true)}
            type="button"
          >
            <MailCheck className="size-5" />
            Công bố kết quả
          </button>
          <div className="mt-3 flex items-start gap-2 text-[11.5px] font-medium leading-snug text-slate-400">
            <Mail className="mt-0.5 size-4 shrink-0" />
            Điểm tổng được BE tính lại từ tất cả phần thi; học sinh nhận thông báo khi công bố.
          </div>
        </div>
      </div>

      {publishOpen ? (
        <PublishDialog
          items={publishItems}
          onCancel={() => setPublishOpen(false)}
          onConfirm={doPublish}
          student={detail.studentName}
        />
      ) : null}
    </>
  )
}

function ScoreChip({
  className,
  label,
  value,
}: {
  className: string
  label: string
  value: number
}) {
  return (
    <div className={`flex-1 rounded-xl px-1.5 py-3 text-center ${className}`}>
      <div className="text-[10.5px] font-bold opacity-80">{label}</div>
      <div className="text-[22px] font-extrabold">{formatScore(value)}</div>
    </div>
  )
}

export function SchoolAdminReevaluationDetailPage() {
  const navigate = useNavigate()
  const { requestId } = useParams()
  const appealQuery = useAppealQuery(requestId ?? null)
  const approveMutation = useApproveMutation()
  const rejectMutation = useRejectMutation()
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const detail = appealQuery.data

  if (appealQuery.isLoading) {
    return <PageLoader />
  }

  if (!detail) {
    return (
      <section className="mx-auto max-w-300">
        <BackButton onClick={() => navigate('/school-admin/reevaluation')} />
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-16 text-center text-sm text-slate-400">
          Không tìm thấy yêu cầu phúc khảo.
        </div>
      </section>
    )
  }

  function handleApprove(deadline: string) {
    approveMutation.mutate(
      { deadline, id: detail!.id },
      {
        onError: (error) => setMessage(toApiError(error).message),
        onSuccess: () => {
          setApproveOpen(false)
          setMessage('Đã duyệt đơn. Hãy phân công người chấm lại.')
        },
      },
    )
  }

  function handleReject(reason: string) {
    rejectMutation.mutate(
      { id: detail!.id, reason },
      {
        onError: (error) => setMessage(toApiError(error).message),
        onSuccess: () => {
          setRejectOpen(false)
          setMessage('Đã từ chối đơn và thông báo cho học sinh.')
        },
      },
    )
  }

  return (
    <section className="mx-auto max-w-300">
      <BackButton onClick={() => navigate('/school-admin/reevaluation')} />

      {detail.status === 'APPROVED' ? (
        <AssignPanel detail={detail} toast={setMessage} />
      ) : detail.status === 'COMPARING' ? (
        <ComparePanel detail={detail} toast={setMessage} />
      ) : (
        <DetailPanel
          detail={detail}
          onOpenApprove={() => setApproveOpen(true)}
          onOpenReject={() => setRejectOpen(true)}
          toast={setMessage}
        />
      )}

      {approveOpen ? (
        <ApproveDialog
          isPending={approveMutation.isPending}
          onCancel={() => setApproveOpen(false)}
          onConfirm={handleApprove}
        />
      ) : null}

      {rejectOpen ? (
        <RejectDialog onCancel={() => setRejectOpen(false)} onConfirm={handleReject} />
      ) : null}

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
    </section>
  )
}

// ============================= Teacher: List =============================

export function TeacherReevaluationPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const tasksQuery = useMyAppealTasksQuery(page, PAGE_SIZE)

  const pageData = tasksQuery.data
  const tasks = pageData?.content ?? []
  const totalElements = pageData?.totalElements ?? 0
  const totalPages = pageData?.totalPages ?? 0
  const pending = tasks.filter((t) => t.myStatus === 'ASSIGNED').length
  const submitted = tasks.filter((t) => t.myStatus === 'SUBMITTED').length

  return (
    <section className="mx-auto max-w-300">
      <div>
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-cyan-700">
          Chấm phúc khảo
        </p>
        <h1 className="mt-1.5 text-[30px] font-extrabold tracking-tight text-slate-900">
          Bài được phân công chấm lại
        </h1>
        <p className="mt-1.5 max-w-xl text-[15px] text-slate-500">
          Nghe lại bài nói, chấm theo tiêu chí của rubric và nộp báo cáo. Bạn chấm độc lập, ẩn danh
          với giám khảo khác.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Headphones size={19} />} iconTone="amber" label="Cần chấm" value={pending} />
        <StatCard
          icon={<CircleCheck size={19} />}
          iconTone="emerald"
          label="Đã nộp"
          value={submitted}
        />
        <StatCard
          icon={<Inbox size={19} />}
          iconTone="indigo"
          label="Tổng phân công"
          value={totalElements}
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Kỳ thi · Phần thi
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Hạn xử lý
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
                  <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={4}>
                    Đang tải…
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={4}>
                    Chưa có bài nào được phân công.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const done = task.myStatus === 'SUBMITTED'
                  return (
                    <tr className="border-b border-slate-100" key={task.appealId}>
                      <td className="px-5 py-3.5">
                        <div className="text-[13.5px] font-semibold text-slate-700">
                          {task.examName}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-400">
                          {partLabelsText(task.partLabels)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-500">
                        <div>{formatIsoDateTime(task.deadline)}</div>
                        {task.overdue ? <OverdueBadge /> : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge
                          label={done ? 'Đã nộp' : 'Cần chấm'}
                          tone={done ? 'success' : 'warning'}
                        />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          className={[
                            'inline-flex h-9.5 items-center gap-1.5 rounded-lg px-4 text-[13px] font-bold transition',
                            done
                              ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              : 'bg-cyan-600 text-white hover:bg-cyan-700',
                          ].join(' ')}
                          onClick={() => navigate(`/teacher/reevaluation/${task.appealId}`)}
                          type="button"
                        >
                          <Mic className="size-4" />
                          {done ? 'Xem lại' : 'Chấm ngay'}
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
              onClick={() => setPage((p) => p - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] font-bold text-slate-700 disabled:opacity-50"
              disabled={tasksQuery.isFetching || page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
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

// ============================= Teacher: Rescore =============================

/** Điểm khởi tạo cho MỌI phần thi: đã nộp thì lấy lại báo cáo, chưa thì mồi từ điểm hiện hành. */
function initialScores(detail: AppealTaskDetail): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {}
  for (const item of detail.items) {
    const submitted = detail.myReport.find((report) => report.appealItemId === item.appealItemId)
    const perCriterion: Record<string, number> = {}
    for (const criterion of detail.criteria) {
      const fromReport = submitted?.scores.find((s) => s.criterionId === criterion.id)
      if (fromReport) {
        perCriterion[criterion.id] = fromReport.score
        continue
      }
      const baseline = item.baselineScores.find((s) => s.criterionId === criterion.id)
      const start = baseline ? baseline.score : criterion.minScore
      perCriterion[criterion.id] = Math.max(
        criterion.minScore,
        Math.min(criterion.maxScore, start),
      )
    }
    result[item.appealItemId] = perCriterion
  }
  return result
}

function initialComments(detail: AppealTaskDetail): Record<string, string> {
  const result: Record<string, string> = {}
  for (const item of detail.items) {
    const submitted = detail.myReport.find((report) => report.appealItemId === item.appealItemId)
    result[item.appealItemId] = submitted?.note ?? ''
  }
  return result
}

export function TeacherReevaluationRescorePage() {
  const navigate = useNavigate()
  const { requestId } = useParams()
  const detailQuery = useAppealTaskDetailQuery(requestId ?? null)
  const submitMutation = useSubmitReportMutation()
  const detail = detailQuery.data

  // Điểm và nhận xét theo TỪNG phần thi: appealItemId -> (criterionId -> điểm).
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [initializedFor, setInitializedFor] = useState<string | null>(null)

  // Đồng bộ state khi mở một bài khác (điều hướng trực tiếp giữa các bài).
  if (detail && detail.appealId !== initializedFor) {
    setScores(initialScores(detail))
    setComments(initialComments(detail))
    setInitializedFor(detail.appealId)
  }

  if (detailQuery.isLoading) {
    return <PageLoader />
  }

  if (!detail) {
    return (
      <section className="mx-auto max-w-300">
        <BackButton onClick={() => navigate('/teacher/reevaluation')} />
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-16 text-center text-sm text-slate-400">
          Không tìm thấy bài chấm lại.
        </div>
      </section>
    )
  }

  // BE chặn nộp lại sau khi đã SUBMITTED — màn này thành chỉ-đọc khi đã nộp.
  // myReport rỗng nghĩa là chưa nộp (BE trả mảng rỗng, không phải null).
  const readOnly = detail.myReport.length > 0

  const scoreOf = (appealItemId: string, criterion: { id: string; minScore: number }) =>
    scores[appealItemId]?.[criterion.id] ?? criterion.minScore

  const overallOf = (appealItemId: string) =>
    bandRound(
      avgScore(
        detail!.criteria.map((c) => ({
          criterionId: c.id,
          criterionCode: c.code,
          label: c.label,
          score: scoreOf(appealItemId, c),
        })),
      ),
    )

  function setScore(appealItemId: string, criterionId: string, value: number) {
    setScores((current) => ({
      ...current,
      [appealItemId]: { ...current[appealItemId], [criterionId]: value },
    }))
  }

  function submit() {
    if (readOnly) {
      return
    }
    // BE yêu cầu nộp TRỌN GÓI: đủ mọi phần thi, mỗi phần đủ mọi tiêu chí của rubric.
    const payload: ItemReportInput[] = detail!.items.map((item) => ({
      appealItemId: item.appealItemId,
      note: comments[item.appealItemId] || undefined,
      scores: detail!.criteria.map((c) => ({
        criterionId: c.id,
        rationale: undefined,
        score: scoreOf(item.appealItemId, c),
      })),
    }))
    submitMutation.mutate(
      { id: detail!.appealId, items: payload },
      {
        onError: (error) => setMessage(toApiError(error).message),
        onSuccess: () => {
          setMessage('Đã nộp báo cáo chấm lại.')
          window.setTimeout(() => navigate('/teacher/reevaluation'), 900)
        },
      },
    )
  }

  return (
    <section className="mx-auto max-w-300">
      <BackButton onClick={() => navigate('/teacher/reevaluation')} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3.5">
        <div>
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-cyan-700">Chấm lại</p>
          <h1 className="mt-1.5 text-[25px] font-extrabold tracking-tight text-slate-900">
            {partLabelsText(detail.items.map((item) => item.partLabel ?? 'Phần thi'))}
          </h1>
          <p className="mt-1 text-[13.5px] font-medium text-slate-500">
            Chấm đủ {detail.criteria.length} tiêu chí cho cả {detail.items.length} phần thi — nộp
            một lần cho toàn bộ.
          </p>
        </div>
        {readOnly ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700">
            <CircleCheck className="size-4" />
            Đã nộp báo cáo
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700">
            <EyeOff className="size-4" />
            Chấm ẩn danh, độc lập
          </div>
        )}
      </div>

      <div className="grid gap-7">
        {detail.items.map((item) => {
          const baselineAvg = bandRound(avgScore(item.baselineScores))
          const baselineValueOf = (criterionId: string) =>
            item.baselineScores.find((s) => s.criterionId === criterionId)?.score ?? null
          return (
            <div className="grid gap-4.5 lg:grid-cols-[1.15fr_1fr]" key={item.appealItemId}>
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
                    <TurnList turns={item.turns} />
                  </div>
                  <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-violet-50 px-3.5 py-3">
                    <Bot className="size-4.5 text-violet-600" />
                    <span className="flex-1 text-[12.5px] font-semibold text-violet-700">
                      Điểm tham chiếu của bản chấm hiện hành
                    </span>
                    <span className="text-[12.5px] font-bold text-violet-700">
                      TB {formatScore(baselineAvg)}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
                  <div className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
                    <MessageSquare className="size-4.5 text-cyan-700" />
                    Nhận xét &amp; căn cứ chấm lại
                  </div>
                  <textarea
                    className="mt-3 min-h-30 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13.5px] leading-relaxed text-slate-700 outline-none focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={readOnly}
                    onChange={(event) =>
                      setComments((current) => ({
                        ...current,
                        [item.appealItemId]: event.target.value,
                      }))
                    }
                    placeholder="Ghi rõ căn cứ điều chỉnh điểm theo từng tiêu chí..."
                    value={comments[item.appealItemId] ?? ''}
                  />
                </div>
              </div>

              <div className="grid gap-3.5">
                <div className="flex items-center justify-between rounded-2xl border-2 border-cyan-500 bg-linear-to-r from-cyan-50 to-white px-5 py-4">
                  <div>
                    <div className="text-[12.5px] font-bold text-cyan-700">
                      Điểm chấm lại · {item.partLabel ?? 'Phần thi'}
                    </div>
                    <div className="text-[11.5px] font-medium text-slate-400">
                      Trung bình {detail.criteria.length} tiêu chí
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[38px] font-extrabold leading-none text-cyan-600">
                      {formatScore(overallOf(item.appealItemId))}
                    </div>
                  </div>
                </div>

                {detail.criteria.map((criterion) => (
                  <CriteriaScoreCard
                    aiValue={baselineValueOf(criterion.id)}
                    criterion={criterion}
                    key={criterion.id}
                    onChange={(value) => setScore(item.appealItemId, criterion.id, value)}
                    readOnly={readOnly}
                    value={scoreOf(item.appealItemId, criterion)}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {readOnly ? (
          <div className="inline-flex h-12.5 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-[15px] font-bold text-emerald-700">
            <CircleCheck className="size-5" />
            Đã nộp — không thể chỉnh sửa
          </div>
        ) : (
          <button
            className="inline-flex h-12.5 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 text-[15px] font-bold text-white shadow-lg shadow-cyan-600/30 transition hover:bg-cyan-700 disabled:opacity-60"
            disabled={submitMutation.isPending}
            onClick={submit}
            type="button"
          >
            <FileUp className="size-5" />
            Nộp báo cáo cho {detail.items.length} phần thi
          </button>
        )}
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
    </section>
  )
}
