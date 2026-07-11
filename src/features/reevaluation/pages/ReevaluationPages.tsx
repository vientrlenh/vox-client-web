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
  Hash,
  Headphones,
  History,
  Inbox,
  Loader,
  Mail,
  MailCheck,
  MessageSquare,
  Mic,
  Minus,
  Plus,
  RefreshCw,
  UserCheck,
  Users,
  UsersRound,
  X,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { DetailHeaderCard } from '@/shared/ui/DetailHeaderCard'
import { FilterChips } from '@/shared/ui/FilterChips'
import {
  useReevaluationRequestQuery,
  useReevaluationRequestsQuery,
  useReevaluationStatsQuery,
  useReviewersQuery,
  useTeacherTasksQuery,
} from '../api/useReevaluationQueries'
import {
  useApproveMutation,
  useAssignMutation,
  usePublishMutation,
  useRejectMutation,
  useSubmitReportMutation,
} from '../api/useReevaluationMutations'
import { AiScoreBars } from '../components/AiScoreBars'
import { AudioPlayerMock } from '../components/AudioPlayerMock'
import { CompareTable } from '../components/CompareTable'
import { CriteriaScoreCard } from '../components/CriteriaScoreCard'
import { ProcessTimeline } from '../components/ProcessTimeline'
import { PublishDialog } from '../components/PublishDialog'
import { RejectDialog } from '../components/RejectDialog'
import { ReviewerPickerCard } from '../components/ReviewerPickerCard'
import { CURRENT_TEACHER_ID, getReviewer, suggestedFinal } from '../mock/reevaluationStore'
import {
  avatarClasses,
  avgScore,
  bandRound,
  CRITERIA,
  EMPTY_SCORES,
  formatDuration,
  formatScore,
  getReevaluationStatusDisplay,
  initials,
  type CriterionKey,
  type CriterionScores,
  type ReevaluationRequest,
  type ReevaluationStatus,
} from '../types'

const STATUS_FILTERS: Array<{ label: string; value: '' | ReevaluationStatus }> = [
  { label: 'Tất cả', value: '' },
  { label: 'Chờ duyệt', value: 'pending' },
  { label: 'Chờ phân công', value: 'approved' },
  { label: 'Đang chấm lại', value: 'grading' },
  { label: 'Chờ đối chiếu', value: 'comparing' },
  { label: 'Đã công bố', value: 'published' },
  { label: 'Từ chối', value: 'rejected' },
]

const ACTION_LABEL: Record<ReevaluationStatus, string> = {
  pending: 'Xem & duyệt',
  approved: 'Phân công',
  grading: 'Theo dõi',
  comparing: 'Đối chiếu',
  published: 'Xem kết quả',
  rejected: 'Xem lý do',
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

// ============================= School Admin: List =============================

export function SchoolAdminReevaluationPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'' | ReevaluationStatus>('')
  const requestsQuery = useReevaluationRequestsQuery()
  const statsQuery = useReevaluationStatsQuery()

  const all = requestsQuery.data ?? []
  const visible = status === '' ? all : all.filter((r) => r.status === status)

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
            onClick={() => requestsQuery.refetch()}
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

      <FilterChips
        items={STATUS_FILTERS}
        onChange={(value) => setStatus(value)}
        value={status}
      />

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-200 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Mã / Học sinh
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
              {visible.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={6}>
                    Không có yêu cầu phù hợp.
                  </td>
                </tr>
              ) : (
                visible.map((request) => {
                  const display = getReevaluationStatusDisplay(request.status)
                  return (
                    <tr
                      className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                      key={request.id}
                      onClick={() => navigate(`/school-admin/reevaluation/${request.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <StudentCell
                          name={request.student}
                          sub={`${request.id} · Lớp ${request.cls}`}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-[13.5px] font-semibold text-slate-700">
                          {request.exam}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-400">
                          {request.part}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex h-7.5 min-w-11 items-center justify-center rounded-lg bg-slate-100 px-2.5 text-sm font-extrabold text-slate-700">
                          {formatScore(request.original)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge label={display.label} tone={display.tone} />
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-500">
                        {request.deadline}
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
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5">
          <span className="text-[12.5px] font-semibold text-slate-500">
            Hiển thị <b className="text-slate-900">{visible.length}</b> / {all.length} yêu cầu
          </span>
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
  request,
  onApprove,
  onOpenReject,
}: {
  request: ReevaluationRequest
  onApprove: () => void
  onOpenReject: () => void
}) {
  const display = getReevaluationStatusDisplay(request.status)
  const aiAvg = bandRound(avgScore(request.aiScores))

  return (
    <>
      <DetailHeaderCard
        actions={
          request.status === 'pending' ? (
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
                onClick={onApprove}
                type="button"
              >
                <CircleCheck className="size-4.5" />
                Duyệt &amp; phân công
              </button>
            </>
          ) : undefined
        }
        metaItems={[
          { icon: <Hash className="size-3.5" />, label: request.id },
          { icon: <Users className="size-3.5" />, label: `Lớp ${request.cls} · ${request.sid}` },
          { icon: <CalendarClock className="size-3.5" />, label: `Gửi ${request.requestedAt}` },
          { icon: <Clock4 className="size-3.5" />, label: `Hạn ${request.deadline}` },
        ]}
        statusLabel={display.label}
        statusTone={display.tone}
        title={request.student}
      />

      <div className="mt-4.5 grid gap-4.5 lg:grid-cols-[1.7fr_1fr]">
        <div className="grid gap-4.5">
          {request.status === 'published' && request.finalScore != null ? (
            <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-white px-6 py-5">
              <div className="text-center">
                <div className="text-[11.5px] font-bold text-slate-400">ĐIỂM GỐC</div>
                <div className="text-3xl font-extrabold text-slate-400 line-through">
                  {formatScore(request.original)}
                </div>
              </div>
              <ArrowRight className="size-6 text-emerald-600" />
              <div className="text-center">
                <div className="text-[11.5px] font-bold text-emerald-600">KẾT QUẢ CÔNG BỐ</div>
                <div className="text-4xl font-extrabold text-emerald-600">
                  {formatScore(request.finalScore)}
                </div>
              </div>
              <div className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-bold text-emerald-600">
                <MailCheck className="size-4.5" />
                Đã thông báo học sinh
              </div>
            </div>
          ) : null}

          <CardShell
            icon={<MessageSquare className="size-4.5 text-cyan-700" />}
            title="Lý do phúc khảo"
          >
            <div className="mt-3 rounded-xl border-l-2 border-cyan-500 bg-slate-50 px-4 py-3.5 text-sm italic leading-relaxed text-slate-700">
              “{request.reason}”
            </div>
            <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 px-3.5 py-3">
                <div className="text-[11.5px] font-semibold text-slate-400">Kỳ thi</div>
                <div className="mt-0.5 text-[13.5px] font-bold text-slate-700">{request.exam}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3.5 py-3">
                <div className="text-[11.5px] font-semibold text-slate-400">
                  Phần thi · Thời lượng
                </div>
                <div className="mt-0.5 text-[13.5px] font-bold text-slate-700">
                  {request.part} · {formatDuration(request.duration)}
                </div>
              </div>
            </div>
          </CardShell>

          <CardShell
            icon={<Bot className="size-4.5 text-violet-600" />}
            right={
              <span className="inline-flex h-9 min-w-13 items-center justify-center rounded-lg bg-violet-50 px-3 text-lg font-extrabold text-violet-700">
                {formatScore(aiAvg)}
              </span>
            }
            title="Điểm gốc do AI chấm"
          >
            <AiScoreBars scores={request.aiScores} />
          </CardShell>

          {request.status === 'grading' ? (
            <CardShell
              icon={<UsersRound className="size-4.5 text-violet-600" />}
              title="Tiến độ chấm lại"
            >
              <div className="mt-3.5 grid gap-2.5">
                {request.assignees.map((assignee, index) => {
                  const teacher = getReviewer(assignee.tid)
                  return (
                    <div
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
                      key={assignee.tid}
                    >
                      <span
                        className={[
                          'inline-flex size-9 shrink-0 items-center justify-center rounded-lg',
                          assignee.done
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-violet-50 text-violet-600',
                        ].join(' ')}
                      >
                        {assignee.done ? (
                          <CircleCheck className="size-4.5" />
                        ) : (
                          <Loader className="size-4.5" />
                        )}
                      </span>
                      <div className="flex-1">
                        <div className="text-[13.5px] font-bold text-slate-700">
                          {teacher?.name ?? `Người chấm ${index + 1}`}
                        </div>
                        <div className="text-[11.5px] font-medium text-slate-400">
                          {teacher?.dept ? `${teacher.dept} · ` : ''}chấm độc lập
                        </div>
                      </div>
                      <StatusBadge
                        label={assignee.done ? 'Đã nộp báo cáo' : 'Đang chấm lại'}
                        tone={assignee.done ? 'success' : 'violet'}
                      />
                    </div>
                  )
                })}
              </div>
            </CardShell>
          ) : null}
        </div>

        <div className="self-start rounded-2xl border border-slate-200 bg-white p-5.5">
          <div className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
            <History className="size-4.5 text-cyan-700" />
            Lịch sử xử lý
          </div>
          <ProcessTimeline events={request.timeline} />
        </div>
      </div>
    </>
  )
}

function AssignPanel({
  request,
  toast,
}: {
  request: ReevaluationRequest
  toast: (message: string) => void
}) {
  const reviewersQuery = useReviewersQuery()
  const assignMutation = useAssignMutation()
  const [picked, setPicked] = useState<string[]>([])

  function togglePick(id: string) {
    setPicked((current) => {
      if (current.includes(id)) {
        return current.filter((value) => value !== id)
      }
      if (current.length >= 2) {
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
      { id: request.id, teacherIds: picked },
      {
        onSuccess: () => {
          setPicked([])
          toast(`Đã phân công ${picked.length} người chấm lại cho ${request.id}.`)
        },
      },
    )
  }

  return (
    <>
      <div className="mb-2">
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-cyan-700">
          Phân công · {request.id}
        </p>
        <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight text-slate-900">
          Phân công giám khảo chấm lại
        </h1>
        <p className="mt-1.5 text-[15px] text-slate-500">
          Yêu cầu của <b className="text-slate-700">{request.student}</b> · Lớp {request.cls} ·{' '}
          {request.exam}
        </p>
      </div>

      <div className="mt-4 grid gap-4.5 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <EyeOff className="mt-0.5 size-5 shrink-0 text-blue-700" />
            <span className="text-[12.5px] font-medium leading-relaxed text-blue-700">
              Chọn <b>tối thiểu 1 giám khảo</b> chấm lại độc lập (tối đa 2 trong bản demo). Danh tính
              giám khảo được ẩn danh với học sinh để đảm bảo khách quan (blind re-evaluation).
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
            <span className="text-lg font-bold text-slate-300">giám khảo</span>
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
  request,
  toast,
}: {
  request: ReevaluationRequest
  toast: (message: string) => void
}) {
  const publishMutation = usePublishMutation()
  const suggested = suggestedFinal(request)
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const effectiveFinal = finalScore == null ? suggested : finalScore
  const aiAvg = bandRound(avgScore(request.aiScores))
  const done = request.assignees.filter((a) => a.done && a.scores)

  function adjust(delta: number) {
    setFinalScore(Math.max(0, Math.min(9, Number((effectiveFinal + delta).toFixed(2)))))
  }

  function doPublish() {
    publishMutation.mutate(
      { id: request.id, finalScore: effectiveFinal },
      {
        onSuccess: () => {
          setPublishOpen(false)
          toast(`Đã công bố ${formatScore(effectiveFinal)} cho ${request.id} và thông báo học sinh.`)
        },
      },
    )
  }

  return (
    <>
      <div className="mb-2">
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-cyan-700">
          Đối chiếu · {request.id}
        </p>
        <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight text-slate-900">
          So sánh &amp; công bố kết quả
        </h1>
        <p className="mt-1.5 text-[15px] text-slate-500">
          <b className="text-slate-700">{request.student}</b> · Lớp {request.cls} · {request.exam} ·{' '}
          {request.part}
        </p>
      </div>

      <div className="mt-4 grid gap-4.5 lg:grid-cols-[1.7fr_1fr]">
        <div className="grid gap-4.5">
          <CompareTable aiScores={request.aiScores} doneAssignees={done} />
          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
              <MessageSquare className="size-4.5 text-cyan-700" />
              Nhận xét của giám khảo (ẩn danh)
            </div>
            {done.map((assignee, index) => (
              <div className="rounded-2xl border border-slate-200 bg-white p-4.5" key={index}>
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-cyan-50 text-[13px] font-extrabold text-cyan-700">
                    C{index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="text-[13.5px] font-bold text-slate-900">
                      Người chấm {index + 1}
                    </div>
                    <div className="text-[11.5px] font-medium text-slate-400">Điểm đề xuất</div>
                  </div>
                  <span className="inline-flex h-8.5 min-w-12 items-center justify-center rounded-lg bg-cyan-50 px-3 text-[17px] font-extrabold text-cyan-700">
                    {formatScore(bandRound(avgScore(assignee.scores as CriterionScores)))}
                  </span>
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-slate-600">{assignee.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="self-start rounded-2xl border-2 border-cyan-500 bg-white p-5.5">
          <div className="text-[13px] font-extrabold text-slate-900">Quyết định cuối cùng</div>
          <div className="mt-4 flex justify-between gap-2.5">
            <ScoreChip className="bg-slate-50 text-slate-400" label="GỐC" value={request.original} />
            <ScoreChip className="bg-violet-50 text-violet-600" label="AI" value={aiAvg} />
            <ScoreChip className="bg-cyan-50 text-cyan-700" label="ĐỀ XUẤT" value={suggested} />
          </div>
          <div className="mt-4.5 text-xs font-bold text-slate-500">Điểm công bố</div>
          <div className="mt-2 flex items-center gap-3">
            <button
              aria-label="Giảm điểm"
              className="inline-flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              onClick={() => adjust(-0.25)}
              type="button"
            >
              <Minus className="size-5" />
            </button>
            <input
              className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-0 py-2 text-center text-3xl font-extrabold text-emerald-600 outline-none"
              max={9}
              min={0}
              onChange={(event) => {
                const next = Number(event.target.value)
                if (event.target.value === '' || Number.isNaN(next)) {
                  return
                }
                setFinalScore(Math.max(0, Math.min(9, next)))
              }}
              step={0.25}
              type="number"
              value={effectiveFinal}
            />
            <button
              aria-label="Tăng điểm"
              className="inline-flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              onClick={() => adjust(0.25)}
              type="button"
            >
              <Plus className="size-5" />
            </button>
          </div>
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
            Học sinh sẽ nhận thông báo kết quả phúc khảo ngay khi công bố.
          </div>
        </div>
      </div>

      {publishOpen ? (
        <PublishDialog
          code={request.id}
          finalScore={effectiveFinal}
          onCancel={() => setPublishOpen(false)}
          onConfirm={doPublish}
          original={request.original}
          student={request.student}
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
  const requestQuery = useReevaluationRequestQuery(requestId ?? null)
  const approveMutation = useApproveMutation()
  const rejectMutation = useRejectMutation()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const request = requestQuery.data

  if (!request) {
    return (
      <section className="mx-auto max-w-300">
        <BackButton onClick={() => navigate('/school-admin/reevaluation')} />
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-16 text-center text-sm text-slate-400">
          Không tìm thấy yêu cầu phúc khảo.
        </div>
      </section>
    )
  }

  function handleApprove() {
    approveMutation.mutate(request!.id, {
      onSuccess: () => setMessage(`Đã duyệt ${request!.id}. Hãy phân công người chấm lại.`),
    })
  }

  function handleReject(reason: string) {
    rejectMutation.mutate(
      { id: request!.id, reason },
      {
        onSuccess: () => {
          setRejectOpen(false)
          setMessage(`Đã từ chối ${request!.id} và thông báo cho học sinh.`)
        },
      },
    )
  }

  return (
    <section className="mx-auto max-w-300">
      <BackButton onClick={() => navigate('/school-admin/reevaluation')} />

      {request.status === 'approved' ? (
        <AssignPanel request={request} toast={setMessage} />
      ) : request.status === 'comparing' ? (
        <ComparePanel request={request} toast={setMessage} />
      ) : (
        <DetailPanel
          onApprove={handleApprove}
          onOpenReject={() => setRejectOpen(true)}
          request={request}
        />
      )}

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
  const tasksQuery = useTeacherTasksQuery(CURRENT_TEACHER_ID)
  const tasks = tasksQuery.data ?? []

  const mineOf = (request: ReevaluationRequest) =>
    request.assignees.find((a) => a.tid === CURRENT_TEACHER_ID)
  const pending = tasks.filter((r) => !mineOf(r)?.done).length
  const submitted = tasks.filter((r) => mineOf(r)?.done).length

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
          Nghe lại bài nói, chấm theo 5 tiêu chí và nộp báo cáo. Bạn chấm độc lập, ẩn danh với giám
          khảo khác.
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
        <StatCard icon={<Inbox size={19} />} iconTone="indigo" label="Tổng phân công" value={tasks.length} />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Học sinh
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Kỳ thi · Phần thi
                </th>
                <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase text-slate-500">
                  Thời lượng
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
              {tasks.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-400" colSpan={5}>
                    Chưa có bài nào được phân công.
                  </td>
                </tr>
              ) : (
                tasks.map((request) => {
                  const mine = mineOf(request)
                  const done = mine?.done ?? false
                  return (
                    <tr className="border-b border-slate-100" key={request.id}>
                      <td className="px-5 py-3.5">
                        <StudentCell
                          name={request.student}
                          sub={`${request.id} · Lớp ${request.cls}`}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-[13.5px] font-semibold text-slate-700">
                          {request.exam}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-400">
                          {request.part}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
                          <Headphones className="size-4 text-slate-400" />
                          {formatDuration(request.duration)}
                        </span>
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
                          onClick={() => navigate(`/teacher/reevaluation/${request.id}`)}
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
      </div>
    </section>
  )
}

// ============================= Teacher: Rescore =============================

export function TeacherReevaluationRescorePage() {
  const navigate = useNavigate()
  const { requestId } = useParams()
  const requestQuery = useReevaluationRequestQuery(requestId ?? null)
  const submitMutation = useSubmitReportMutation()
  const request = requestQuery.data

  const mine = request?.assignees.find((a) => a.tid === CURRENT_TEACHER_ID)
  const [scores, setScores] = useState<CriterionScores>(() =>
    mine?.done && mine.scores ? { ...mine.scores } : { ...EMPTY_SCORES },
  )
  const [comment, setComment] = useState(() => (mine?.done ? mine.note ?? '' : ''))
  const [message, setMessage] = useState<string | null>(null)
  const [initializedFor, setInitializedFor] = useState<string | null>(request?.id ?? null)

  // Đồng bộ state khi mở một request khác (điều hướng trực tiếp giữa các bài).
  if (request && request.id !== initializedFor) {
    const assignee = request.assignees.find((a) => a.tid === CURRENT_TEACHER_ID)
    setScores(assignee?.done && assignee.scores ? { ...assignee.scores } : { ...EMPTY_SCORES })
    setComment(assignee?.done ? assignee.note ?? '' : '')
    setInitializedFor(request.id)
  }

  if (!request) {
    return (
      <section className="mx-auto max-w-300">
        <BackButton onClick={() => navigate('/teacher/reevaluation')} />
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-16 text-center text-sm text-slate-400">
          Không tìm thấy bài chấm lại.
        </div>
      </section>
    )
  }

  const overall = bandRound(avgScore(scores))
  const delta = avgScore(scores) - request.original
  const aiAvg = bandRound(avgScore(request.aiScores))

  function setScore(key: CriterionKey, value: number) {
    setScores((current) => ({ ...current, [key]: value }))
  }

  function submit() {
    submitMutation.mutate(
      { id: request!.id, teacherId: CURRENT_TEACHER_ID, scores, note: comment },
      {
        onSuccess: () => {
          setMessage(`Đã nộp báo cáo chấm lại cho ${request!.id}.`)
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
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-cyan-700">
            Chấm lại · {request.id}
          </p>
          <h1 className="mt-1.5 text-[25px] font-extrabold tracking-tight text-slate-900">
            {request.student} · Lớp {request.cls}
          </h1>
          <p className="mt-1 text-[13.5px] font-medium text-slate-500">
            {request.exam} · {request.part}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700">
          <EyeOff className="size-4" />
          Chấm ẩn danh, độc lập
        </div>
      </div>

      <div className="grid gap-4.5 lg:grid-cols-[1.15fr_1fr]">
        <div className="grid gap-4.5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
                <Mic className="size-4.5 text-cyan-700" />
                Bản ghi bài nói
              </div>
              <span className="text-xs font-semibold text-slate-400">
                Phần thi {formatDuration(request.duration)}
              </span>
            </div>
            <div className="mt-4">
              <AudioPlayerMock duration={request.duration} />
            </div>
            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-violet-50 px-3.5 py-3">
              <Bot className="size-4.5 text-violet-600" />
              <span className="flex-1 text-[12.5px] font-semibold text-violet-700">
                Điểm tham chiếu do AI chấm
              </span>
              <span className="text-[12.5px] font-bold text-violet-700">
                Tổng {formatScore(aiAvg)} · Gốc {formatScore(request.original)}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
            <div className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
              <MessageSquare className="size-4.5 text-cyan-700" />
              Nhận xét &amp; căn cứ chấm lại
            </div>
            <textarea
              className="mt-3 min-h-30 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13.5px] leading-relaxed text-slate-700 outline-none focus:border-cyan-400"
              onChange={(event) => setComment(event.target.value)}
              placeholder="Ghi rõ căn cứ điều chỉnh điểm theo từng tiêu chí..."
              value={comment}
            />
          </div>
        </div>

        <div className="grid gap-3.5">
          <div className="flex items-center justify-between rounded-2xl border-2 border-cyan-500 bg-linear-to-r from-cyan-50 to-white px-5 py-4">
            <div>
              <div className="text-[12.5px] font-bold text-cyan-700">Điểm chấm lại của bạn</div>
              <div className="text-[11.5px] font-medium text-slate-400">
                Trung bình 5 tiêu chí · Gốc {formatScore(request.original)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[38px] font-extrabold leading-none text-cyan-600">
                {formatScore(overall)}
              </div>
              <div className="text-xs font-bold text-emerald-600">
                {(delta > 0 ? '+' : '') + formatScore(delta)} so với gốc
              </div>
            </div>
          </div>

          {CRITERIA.map((criterion) => (
            <CriteriaScoreCard
              aiValue={request.aiScores[criterion.key]}
              criterion={criterion}
              key={criterion.key}
              onChange={(value) => setScore(criterion.key, value)}
              value={scores[criterion.key]}
            />
          ))}

          <button
            className="inline-flex h-12.5 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 text-[15px] font-bold text-white shadow-lg shadow-cyan-600/30 transition hover:bg-cyan-700 disabled:opacity-60"
            disabled={submitMutation.isPending}
            onClick={submit}
            type="button"
          >
            <FileUp className="size-5" />
            Nộp báo cáo chấm lại
          </button>
        </div>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
    </section>
  )
}
