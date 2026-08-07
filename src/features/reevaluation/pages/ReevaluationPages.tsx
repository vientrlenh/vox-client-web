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
  History,
  Inbox,
  Info,
  Loader,
  MailCheck,
  MessageSquare,
  RefreshCw,
  Undo2,
  UserCheck,
  Users,
  UsersRound,
  X,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import {
  getAssignmentStatusDisplay,
  getOutcomeDisplay,
  localDateTimeToIso,
} from '@/features/grading/types'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { PageLoader } from '@/shared/ui/PageLoader'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { DetailHeaderCard } from '@/shared/ui/DetailHeaderCard'
import { FilterChips } from '@/shared/ui/FilterChips'
import { TabPillGroup, type TabPillItem } from '@/shared/ui/TabPill'
import { toApiError } from '@/shared/api'
import {
  useAppealQuery,
  useAppealReviewersQuery,
  useAppealsQuery,
  useAppealStatsQuery,
} from '../api/useReevaluationQueries'
import {
  useApproveMutation,
  useAssignMutation,
  useRejectMutation,
} from '../api/useReevaluationMutations'
import { AiScoreBars } from '../components/AiScoreBars'
import { ApproveDialog } from '../components/ApproveDialog'
import { ProcessTimeline } from '../components/ProcessTimeline'
import { RejectDialog } from '../components/RejectDialog'
import { ReviewerPickerCard } from '../components/ReviewerPickerCard'
import {
  APPEAL_SCOPE_TEXT,
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
  type AppealDetail,
  type AppealItem,
  type AppealStatus,
} from '../types'

const PAGE_SIZE = 20

/**
 * Tab theo từng câu: value là appealItemId.
 *
 * Nhãn phải kèm số thứ tự câu. `partLabel` là TIÊU ĐỀ PHẦN, không phải tên câu — từ khi
 * đơn phủ toàn bài, một bài 10 câu cùng một phần sẽ ra 10 tab trùng y hệt tên nếu chỉ
 * lấy mỗi partLabel.
 */
function itemTabItems(items: AppealItem[]): TabPillItem[] {
  return items.map((item, index) => ({
    value: item.appealItemId,
    label: item.partLabel ? `${item.partLabel} · Câu ${index + 1}` : `Câu ${index + 1}`,
  }))
}

const STATUS_FILTERS: Array<{ label: string; value: '' | AppealStatus }> = [
  { label: 'Tất cả', value: '' },
  { label: 'Chờ duyệt', value: 'PENDING' },
  { label: 'Đã duyệt', value: 'APPROVED' },
  { label: 'Đang chấm lại', value: 'GRADING' },
  { label: 'Đã công bố', value: 'PUBLISHED' },
  { label: 'Từ chối', value: 'REJECTED' },
  { label: 'Đã rút', value: 'WITHDRAWN' },
]

const ACTION_LABEL: Record<AppealStatus, string> = {
  APPROVED: 'Phân công',
  GRADING: 'Theo dõi',
  PENDING: 'Xem & duyệt',
  PUBLISHED: 'Xem kết quả',
  REJECTED: 'Xem lý do',
  WITHDRAWN: 'Xem đơn',
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

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
        <StatCard
          icon={<Undo2 size={19} />}
          iconTone="slate"
          label="Học sinh đã rút"
          value={statsQuery.data?.withdrawn ?? '-'}
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
                  Giám khảo
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
                  <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={7}>
                    Đang tải…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={7}>
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
                          {APPEAL_SCOPE_TEXT}
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
                      <td className="px-4 py-3.5">
                        {request.reviewerName ? (
                          <>
                            <div className="text-[13.5px] font-semibold text-slate-700">
                              {request.reviewerName}
                            </div>
                            <div className="mt-0.5">
                              <StatusBadge
                                label={getAssignmentStatusDisplay(request.reviewerStatus).label}
                                tone={getAssignmentStatusDisplay(request.reviewerStatus).tone}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="text-[13px] font-semibold text-slate-400">
                            Chưa phân công
                          </span>
                        )}
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
  onOpenAssign,
  onOpenReject,
}: {
  detail: AppealDetail
  onOpenApprove: () => void
  onOpenAssign: () => void
  onOpenReject: () => void
}) {
  const display = getAppealStatusDisplay(detail.status)
  const partLabels = detail.items.map((item) => item.partLabel ?? 'Phần thi')
  const reviewer = detail.reviewer
  const outcomeDisplay = getOutcomeDisplay(reviewer?.outcome)
  const [activeItemId, setActiveItemId] = useState<string>(detail.items[0]?.appealItemId ?? '')
  const activeItem = detail.items.find((i) => i.appealItemId === activeItemId) ?? detail.items[0]

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
                Giám khảo đã chấm lại <b>toàn bộ bài làm</b> ({detail.items.length} câu).{' '}
                <b>{formatScore(detail.finalScore)}</b> ở trên là <b>điểm tổng cả bài</b> sau phúc
                khảo — hệ thống tính lại từ tất cả các phần.
              </div>
            </div>
          ) : null}

          {detail.status === 'WITHDRAWN' ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <Undo2 className="mt-0.5 size-4.5 shrink-0 text-slate-500" />
              <div className="text-[12.5px] font-medium leading-relaxed text-slate-600">
                Học sinh đã rút đơn lúc <b>{formatIsoDateTime(detail.withdrawnAt)}</b>. Đơn khép lại,
                điểm bài thi giữ nguyên như trước khi phúc khảo.
              </div>
            </div>
          ) : null}

          {detail.items.length > 1 ? (
            <TabPillGroup
              items={itemTabItems(detail.items)}
              onChange={setActiveItemId}
              value={activeItem?.appealItemId ?? ''}
            />
          ) : null}

          {detail.status === 'PUBLISHED' && activeItem?.finalScore != null ? (
            <div className="flex items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
              <span className="text-[12.5px] font-bold text-cyan-700">
                Điểm sau chấm lại · {activeItem.partLabel ?? 'phần thi'}
              </span>
              <span className="inline-flex h-8 min-w-12 items-center justify-center rounded-lg bg-white px-3 text-lg font-extrabold text-cyan-700">
                {formatScore(activeItem.finalScore)}
              </span>
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

          {(activeItem ? [activeItem] : []).map((item) => (
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

          {reviewer ? (
            <CardShell
              icon={<UsersRound className="size-4.5 text-violet-600" />}
              right={
                reviewer.status === 'ASSIGNED' ? (
                  <button
                    className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-600 transition hover:bg-slate-50"
                    onClick={onOpenAssign}
                    type="button"
                  >
                    <UserCheck className="size-4" />
                    Đổi giám khảo
                  </button>
                ) : undefined
              }
              title="Người chấm lại"
            >
              <div className="mt-3.5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                <span
                  className={[
                    'inline-flex size-9 shrink-0 items-center justify-center rounded-lg',
                    reviewer.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-violet-50 text-violet-600',
                  ].join(' ')}
                >
                  {reviewer.status === 'COMPLETED' ? (
                    <CircleCheck className="size-4.5" />
                  ) : (
                    <Loader className="size-4.5" />
                  )}
                </span>
                <div className="flex-1">
                  <div className="text-[13.5px] font-bold text-slate-700">
                    {reviewer.reviewerName || 'Giám khảo'}
                  </div>
                  <div className="text-[11.5px] font-medium text-slate-400">
                    Giao {formatIsoDateTime(reviewer.assignedAt)} · hạn{' '}
                    {formatIsoDateTime(reviewer.deadlineAt)}
                  </div>
                  {reviewer.overdue ? <OverdueBadge /> : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge
                    label={getAssignmentStatusDisplay(reviewer.status).label}
                    tone={getAssignmentStatusDisplay(reviewer.status).tone}
                  />
                  {outcomeDisplay ? (
                    <StatusBadge label={outcomeDisplay.label} tone={outcomeDisplay.tone} />
                  ) : null}
                </div>
              </div>

              {detail.reviewerOverrideReason ? (
                <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                  <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div className="text-[12px] font-medium leading-relaxed text-amber-800">
                    Người này đã từng chấm tay chính bài thi đó. Quản trị trường vẫn giao với lý do:{' '}
                    <b>“{detail.reviewerOverrideReason}”</b>
                  </div>
                </div>
              ) : null}
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
  const reviewersQuery = useAppealReviewersQuery(detail.id)
  const assignMutation = useAssignMutation()
  const [pickedId, setPickedId] = useState<string | null>(detail.reviewer?.reviewerId ?? null)
  const [overrideReason, setOverrideReason] = useState('')
  const [deadlineAt, setDeadlineAt] = useState('')

  const picked = (reviewersQuery.data ?? []).find((r) => r.id === pickedId) ?? null
  // BE chặn người đã chấm tay chính bài này, trừ khi admin nêu lý do ghi đè — chặn sớm
  // ở FE để không phải đi một vòng 400 mới biết thiếu gì.
  const needsOverride = picked?.conflicted === true
  const canSubmit =
    picked != null && (!needsOverride || overrideReason.trim().length > 0) && !assignMutation.isPending

  function confirmAssign() {
    if (!picked || !canSubmit) {
      return
    }
    assignMutation.mutate(
      {
        deadlineAt: localDateTimeToIso(deadlineAt),
        id: detail.id,
        overrideReason: needsOverride ? overrideReason.trim() : undefined,
        reviewerId: picked.id,
      },
      {
        onError: (error) => toast(toApiError(error).message),
        onSuccess: () => {
          setOverrideReason('')
          toast(`Đã giao ${picked.name} chấm lại.`)
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
              Chọn <b>một giám khảo</b> chấm lại. Danh tính giám khảo được ẩn danh với học sinh để
              đảm bảo khách quan (blind re-evaluation). Giám khảo nộp bài là kết quả công bố luôn.
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(reviewersQuery.data ?? []).map((reviewer) => (
              <ReviewerPickerCard
                key={reviewer.id}
                onToggle={() => setPickedId(reviewer.id === pickedId ? null : reviewer.id)}
                reviewer={reviewer}
                selected={reviewer.id === pickedId}
              />
            ))}
          </div>
        </div>

        <div className="self-start rounded-2xl border border-slate-200 bg-white p-5.5">
          <div className="text-[13px] font-extrabold text-slate-900">Người được chọn</div>
          <div className="mt-2.5 text-[15px] font-bold text-cyan-700">
            {picked?.name ?? <span className="text-slate-300">Chưa chọn ai</span>}
          </div>

          <div className="mt-4 grid gap-2">
            <LegendDot className="bg-emerald-500" label="Tải nhẹ (0–1 bài)" />
            <LegendDot className="bg-amber-500" label="Tải vừa (2 bài)" />
            <LegendDot className="bg-red-500" label="Tải nặng (≥3 bài)" />
          </div>

          <label className="mt-4 block">
            <span className="text-[12px] font-bold text-slate-600">Hạn chấm (tuỳ chọn)</span>
            <input
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] font-semibold text-slate-700 outline-none focus:border-cyan-500"
              onChange={(event) => setDeadlineAt(event.target.value)}
              type="datetime-local"
              value={deadlineAt}
            />
          </label>

          {needsOverride ? (
            <label className="mt-3.5 block">
              <span className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] font-medium leading-relaxed text-amber-800">
                <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <span>
                  <b>{picked?.name}</b> đã chấm tay chính bài thi này. Muốn vẫn giao thì phải nêu lý
                  do — lý do được lưu vào đơn.
                </span>
              </span>
              <textarea
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-cyan-500"
                maxLength={1024}
                onChange={(event) => setOverrideReason(event.target.value)}
                placeholder="Lý do vẫn giao cho người đã chấm bài này…"
                rows={3}
                value={overrideReason}
              />
            </label>
          ) : null}

          <button
            className={[
              'mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14.5px] font-bold text-white transition',
              canSubmit
                ? 'bg-cyan-600 shadow-lg shadow-cyan-600/30 hover:bg-cyan-700'
                : 'cursor-not-allowed bg-slate-300',
            ].join(' ')}
            disabled={!canSubmit}
            onClick={confirmAssign}
            type="button"
          >
            <UserCheck className="size-4.5" />
            {detail.reviewer ? 'Xác nhận đổi giám khảo' : 'Xác nhận phân công'}
          </button>
          <p className="mt-3 text-center text-[11.5px] font-medium leading-snug text-slate-400">
            Sau khi phân công, giám khảo nhận bài trong mục “Chấm bài”, vòng <b>Phúc khảo</b>.
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

export function SchoolAdminReevaluationDetailPage() {
  const navigate = useNavigate()
  const { requestId } = useParams()
  const appealQuery = useAppealQuery(requestId ?? null)
  const approveMutation = useApproveMutation()
  const rejectMutation = useRejectMutation()
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  // Đơn vừa duyệt thì vào thẳng panel phân công; ngoài ra admin còn đổi được người chấm
  // khi vòng chấm chưa xong — BE không có thao tác gỡ, gán lại chính là đổi.
  const [assignOpen, setAssignOpen] = useState(false)
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

      {detail.status === 'APPROVED' || assignOpen ? (
        <AssignPanel
          detail={detail}
          toast={(text) => {
            setAssignOpen(false)
            setMessage(text)
          }}
        />
      ) : (
        <DetailPanel
          detail={detail}
          onOpenApprove={() => setApproveOpen(true)}
          onOpenAssign={() => setAssignOpen(true)}
          onOpenReject={() => setRejectOpen(true)}
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
