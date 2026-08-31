import { useMemo, useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  Gauge,
  Hash,
  MessageSquareQuote,
  Mic2,
  Search,
  Target,
  Trash2,
  UserRound,
} from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { ExamRecordingPlayer } from '@/features/exam-recordings'
import { useForceEndExamSessionMutation } from '@/features/examCore/api/mutations'
import { examQueryKeys, useExamCandidatesQuery, useExamQuery } from '@/features/examCore/api/queries'
import {
  formatDateTime,
  getCandidateName,
  isExamResultsFinalized,
  type ExamAttemptSummaryDto,
} from '@/features/examCore/types'
import { Pagination } from '@/shared/components/Pagination'
import {
  buildValidityRulesForDisplay,
  criterionScorePercentage,
  formatConfidencePercent,
  formatScaleMax,
  getResultScoreTone,
} from '@/shared/lib/aiEvaluation'
import { formatPublishedResult } from '@/shared/lib/resultScore'
import { DetailHeaderCard } from '@/shared/ui/DetailHeaderCard'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { TabPillGroup } from '@/shared/ui/TabPill'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { WordFeedbackText } from '@/shared/ui/WordFeedbackText'
import { QuestionAssetPanel } from '@/features/question/components/QuestionAssetPanel'
import {
  examResultQueryKeys,
  fetchExamItemEvaluation,
  useDeleteExamSessionMutation,
  useExamSessionResultQuery,
  useExamSessionStatusQuery,
  useRetryGradingExamSessionMutation,
  useHandOffGradingToHumanMutation,
  useDecideExamCandidateResultOutcomeMutation,
} from '../api/useExamResultQueries'
import {
  formatScore,
  getAttemptStatusDisplay,
  getExamResultStatusDisplay,
  resolveEvaluationDisplay,
  type ExamCandidateResultDto,
  type ExamItemEvaluationDto,
} from '../types'

type ExamResultsUserRole = 'SCHOOL_ADMIN' | 'TEACHER'

const PAGE_SIZE = 10

const RESULT_STATUS_FILTER_OPTIONS = [
  'PENDING_REVIEW',
  'RELEASED',
  'FINAL',
  'APPEALED',
  'RE_GRADING',
  'INVALID',
  'RETAKE_REQUIRED',
  'PASSED',
  'FAILED',
] as const

function getPendingRowStatus(candidateStatus?: string | null) {
  switch (candidateStatus) {
    case 'ASSIGNED':
      return { label: 'Chưa điểm danh', tone: 'warning' as const }
    case 'ATTENDED':
      return { label: 'Đã có mặt, chưa có kết quả', tone: 'info' as const }
    case 'ABSENT':
      return { label: 'Vắng thi', tone: 'danger' as const }
    case 'EXEMPTED':
      return { label: 'Miễn thi', tone: 'neutral' as const }
    case 'COMPLETED':
      return { label: 'Đã nộp, chưa chấm', tone: 'info' as const }
    default:
      return { label: 'Chưa có kết quả', tone: 'warning' as const }
  }
}

/**
 * Hậu tố " / 100" cho một con số điểm. Không biết thang thì KHÔNG hiện gì -- một con số trần vẫn
 * đúng, còn đoán bừa mẫu số thì sai. Trước 2026-08-11 tổng điểm hiện trần không mẫu số, người xem
 * phải tự đoán thang.
 */
function scaleSuffixOf(scaleMax?: number | null) {
  const formatted = formatScaleMax(scaleMax)
  return formatted === null ? '' : ` / ${formatted}`
}

function scaleSuffix(result: Pick<ExamCandidateResultDto, 'scoringScaleMax'>) {
  const formatted = formatScaleMax(result.scoringScaleMax)
  return formatted === null ? null : <span className="text-slate-400"> / {formatted}</span>
}

/**
 * Màu chữ cho một điểm số, quy đổi về phần trăm theo THANG THẬT trước khi so ngưỡng 80/45.
 *
 * Ngưỡng đó chỉ đúng trên thang phần trăm; truyền điểm thô vào là sai với mọi rubric không phải
 * 0-100 (thang 0-10 thì mọi điểm đều < 45, bài 10/10 cũng đỏ). Đó chính là lỗi có sẵn ở đây trước
 * 2026-08-11 -- thang 0-100 làm điểm trùng phần trăm nên không ai thấy.
 *
 * `criterionScorePercentage` trả nguyên giá trị khi thiếu thang, nên chỗ nào chưa truyền thang
 * vẫn chạy y như cũ thay vì đổi màu bất ngờ.
 */
function getResultScoreTextClass(
  value?: number | null,
  scaleMin?: number | null,
  scaleMax?: number | null,
) {
  const tone = getResultScoreTone(criterionScorePercentage(value, scaleMin, scaleMax))
  if (tone === 'success') {
    return 'text-emerald-600'
  }
  if (tone === 'warning') {
    return 'text-amber-600'
  }
  if (tone === 'danger') {
    return 'text-red-600'
  }
  return 'text-slate-400'
}

function StatePanel({
  description,
  tone,
  title,
}: {
  description: string
  tone: 'danger' | 'info' | 'warning'
  title: string
}) {
  const className =
    tone === 'danger'
      ? 'border-red-200 bg-red-50'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50'
        : 'border-slate-200 bg-white'
  const titleClassName = tone === 'danger' ? 'text-red-900' : tone === 'warning' ? 'text-amber-900' : 'text-slate-900'
  const descriptionClassName = tone === 'danger' ? 'text-red-700' : tone === 'warning' ? 'text-amber-700' : 'text-slate-500'

  return (
    <div className={`rounded-2xl border px-6 py-12 text-center ${className}`}>
      <h2 className={`text-2xl font-extrabold ${titleClassName}`}>{title}</h2>
      <p className={`mt-3 text-sm ${descriptionClassName}`}>{description}</p>
    </div>
  )
}

function ResultBand({
  attempt,
  officialScore,
}: {
  attempt?: ExamAttemptSummaryDto | null
  officialScore?: number | null
}) {
  if (typeof officialScore !== 'number' || Number.isNaN(officialScore)) {
    return <span className="text-[13px] text-slate-400">-</span>
  }

  return (
    <div>
      <p className={`text-[13px] font-bold ${getResultScoreTextClass(officialScore, attempt?.scoringScaleMin, attempt?.scoringScaleMax)}`}>
        {formatScore(officialScore)}
        {scaleSuffixOf(attempt?.scoringScaleMax)}
      </p>
      <p className="text-xs text-slate-500">{formatPublishedResult(attempt)}</p>
    </div>
  )
}

/**
 * Trạng thái phiên cho phép xoá: chấm lỗi, bị gián đoạn, hoặc đã chấm xong.
 *
 * Loại trừ IN_PROGRESS / SUBMITTED / GRADING / EXPIRED — đó là phiên đang thi, đang chờ chấm
 * hoặc đang chấm dở. Xoá lúc đó là cắt ngang một luồng còn đang ghi dữ liệu. DELETED cũng không
 * nằm trong danh sách: xoá rồi thì không xoá lại.
 *
 * Đây chỉ là chốt giao diện; chốt thật nằm ở `DeleteExamSessionUseCase` (quyền, kỳ thi đã chốt sổ,
 * và bắt buộc có lý do).
 */
const DELETABLE_ATTEMPT_STATUSES = new Set(['GRADING_FAILED', 'INTERRUPTED', 'GRADED'])

function canDeleteAttempt(status?: string | null): boolean {
  return status != null && DELETABLE_ATTEMPT_STATUSES.has(status)
}

function AttemptRows({
  attempts,
  canDelete,
  deleteBlockedReason,
  detailBasePath,
  navigate,
  officialAttempt,
  officialScore,
  onDeleteSession,
}: {
  attempts: ExamAttemptSummaryDto[]
  canDelete: boolean
  /** Có giá trị = còn hiện nút xoá nhưng khoá lại, kèm tooltip nói rõ vì sao. */
  deleteBlockedReason?: string
  detailBasePath: string
  navigate: ReturnType<typeof useNavigate>
  officialAttempt?: ExamAttemptSummaryDto | null
  officialScore?: number | null
  onDeleteSession: (sessionId: string) => void
}) {
  if (attempts.length === 0) {
    return <div className="px-4 py-5 text-center text-xs text-slate-400">Thí sinh này chưa có lượt thi nào.</div>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div
        className={`grid gap-3 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 ${
          canDelete ? 'grid-cols-[72px_1.2fr_140px_1fr_110px_90px]' : 'grid-cols-[72px_1.2fr_140px_1fr_110px]'
        }`}
      >
        <span>Lượt</span>
        <span>Thời gian</span>
        <span>Trạng thái</span>
        <span>Điểm / xếp loại</span>
        <span>Chi tiết</span>
        {canDelete ? <span>Xóa</span> : null}
      </div>

      {attempts.map((attempt, index) => {
        const attemptStatus = getAttemptStatusDisplay(attempt.status)
        const isOfficialAttempt = officialAttempt?.sessionId === attempt.sessionId

        return (
          <div
            className={`grid items-center gap-3 border-t border-slate-100 px-3 py-3 ${
              canDelete ? 'grid-cols-[72px_1.2fr_140px_1fr_110px_90px]' : 'grid-cols-[72px_1.2fr_140px_1fr_110px]'
            }`}
            key={attempt.sessionId}
          >
            <div className="text-sm font-bold text-slate-700">#{attempts.length - index}</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{formatDateTime(attempt.startedAt)}</p>
              <p className="text-xs text-slate-500">Nộp bài: {formatDateTime(attempt.submittedAt)}</p>
            </div>
            <span>
              <StatusBadge label={attemptStatus.label} tone={attemptStatus.tone} />
              {/* Lượt đã xoá chỉ quản trị trường / chủ tịch hội đồng mới nhận được từ backend —
                  hiện luôn lý do để trả lời được câu "điểm của em đi đâu". */}
              {attempt.status === 'DELETED' && attempt.deletedReason ? (
                <p className="mt-1 text-xs text-slate-500" title={attempt.deletedReason}>
                  {attempt.deletedReason}
                </p>
              ) : null}
            </span>
            <div>
              <p className={`text-sm font-bold ${getResultScoreTextClass(attempt.totalScore, attempt.scoringScaleMin, attempt.scoringScaleMax)}`}>
                {formatScore(attempt.totalScore)}
                {scaleSuffixOf(attempt.scoringScaleMax)}
              </p>
              <p className="text-xs text-slate-500">
                {formatPublishedResult(attempt)}
              </p>
              {isOfficialAttempt ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge label="Chính thức" tone="violet" />
                  {officialScore != null && officialScore !== attempt.totalScore ? (
                    <span className={`text-xs ${getResultScoreTextClass(officialScore, attempt.scoringScaleMin, attempt.scoringScaleMax)}`}>
                      Điểm chính thức: {formatScore(officialScore)}
                      {scaleSuffixOf(attempt.scoringScaleMax)}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <span>
              <button
                className="inline-flex h-8.5 items-center justify-center gap-1 rounded-full border border-slate-200 px-3 text-xs font-bold text-indigo-600 transition hover:bg-slate-50"
                onClick={() => navigate(`${detailBasePath}/${attempt.sessionId}`)}
                type="button"
              >
                Xem
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </button>
            </span>
            {canDelete ? (
              <span>
                {canDeleteAttempt(attempt.status) ? (
                  <button
                    aria-label="Xóa bài thi này"
                    className="inline-flex size-8.5 items-center justify-center rounded-full border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
                    disabled={Boolean(deleteBlockedReason)}
                    onClick={() => onDeleteSession(attempt.sessionId)}
                    title={deleteBlockedReason}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </button>
                ) : null}
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function ExamResultsListPage({
  detailBasePath,
  examIdOverride,
  title = 'Kết quả kỳ thi',
  userRole,
}: {
  detailBasePath: string
  examIdOverride?: string | null
  title?: string
  userRole: ExamResultsUserRole
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const examId = examIdOverride ?? searchParams.get('examId')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [expandedCandidates, setExpandedCandidates] = useState<Record<string, boolean>>({})
  const examQuery = useExamQuery(examId)
  const candidatesQuery = useExamCandidatesQuery(examId)
  const candidates = useMemo(() => candidatesQuery.data ?? [], [candidatesQuery.data])
  const rows = useMemo(() => candidates.map((candidate) => ({ candidate })), [candidates])
  const deleteSessionMutation = useDeleteExamSessionMutation()
  const { confirmWithReason, dialog: deleteDialog } = useConfirmationDialog()
  const canDeleteSessions = userRole === 'SCHOOL_ADMIN' || (userRole === 'TEACHER' && examQuery.data?.kind === 'CLASS_TEST')
  // Kỳ thi đã đóng hoặc đã công bố kết quả thì backend từ chối xoá (Exam.isResultsFinalized) —
  // khoá nút kèm lý do thay vì để bấm rồi ăn lỗi.
  const deleteBlockedReason = isExamResultsFinalized(examQuery.data?.status)
    ? 'Kỳ thi đã đóng hoặc đã công bố kết quả — không thể xóa bài thi'
    : undefined

  async function handleDeleteSession(sessionId: string) {
    const result = await confirmWithReason({
      confirmLabel: 'Xóa bài thi',
      message:
        'Bài thi sẽ được gỡ khỏi bảng kết quả, hàng đợi chấm và phúc khảo. Dữ liệu bài làm vẫn được giữ lại, quản trị trường và chủ tịch hội đồng vẫn xem lại được kèm lý do bên dưới.',
      reasonLabel: 'Lý do xóa bài thi',
      reasonPlaceholder: 'Ví dụ: vào phòng thi lỗi, phải cho thi lại...',
      requireReason: true,
      title: 'Xác nhận xóa bài thi',
    })
    if (!result.confirmed) {
      return
    }

    await deleteSessionMutation.mutateAsync({ reason: result.reason, sessionId })
    await queryClient.invalidateQueries({ queryKey: examResultQueryKeys.all })
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.candidates(examId) })
  }

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return rows.filter(({ candidate }) => {
      if (statusFilter !== 'ALL' && candidate.officialAttempt?.resultStatus !== statusFilter) {
        return false
      }
      if (!keyword) {
        return true
      }

      const name = getCandidateName(candidate).toLowerCase()
      const email = (candidate.student?.email ?? '').toLowerCase()
      return name.includes(keyword) || email.includes(keyword)
    })
  }, [rows, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const gradedRows = rows.filter((row) => typeof row.candidate.officialScore === 'number')
  const pendingReviewCount = rows.filter((row) =>
    (row.candidate.attempts ?? []).some((attempt) => attempt.status === 'SUBMITTED' || attempt.status === 'GRADING'),
  ).length
  const averageScoreValue =
    gradedRows.length === 0
      ? null
      : gradedRows.reduce((sum, row) => sum + (row.candidate.officialScore ?? 0), 0) / gradedRows.length
  // Trang này là kết quả của MỘT kỳ thi, mà một kỳ gắn đúng một assessment policy nên đúng một
  // rubric version -- mọi thí sinh ở đây cùng thang. Lấy thang của lượt đầu tiên tra được là đủ,
  // không cần (và không nên) trung bình các thang khác nhau.
  const examScale = gradedRows
    .flatMap((row) => row.candidate.attempts ?? [])
    .find((attempt) => typeof attempt.scoringScaleMax === 'number')

  if (!examId) {
    return (
      <section className="mx-auto max-w-240">
        <StatePanel
          description="Trang này cần `examId` để nạp danh sách kết quả."
          title={title}
          tone="info"
        />
      </section>
    )
  }

  if (examQuery.isLoading || candidatesQuery.isLoading) {
    return (
      <section className="mx-auto max-w-240">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
          Đang tải danh sách kết quả...
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-290">
      {deleteDialog}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-[15px] text-slate-500">
            {examQuery.data ? `${examQuery.data.name} • ${examQuery.data.code}` : 'Đang tải thông tin kỳ thi...'}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatCard icon={<UserRound size={19} />} iconTone="indigo" label="Tổng thí sinh" value={rows.length} />
        <StatCard icon={<CheckCircle2 size={19} />} iconTone="emerald" label="Đã có kết quả" value={gradedRows.length} />
        <StatCard icon={<ClipboardList size={19} />} iconTone="amber" label="Chờ chấm" value={pendingReviewCount} />
        <StatCard
          icon={<Gauge size={19} />}
          iconTone="violet"
          label="Điểm trung bình"
          value={(
            <span className={getResultScoreTextClass(averageScoreValue, examScale?.scoringScaleMin, examScale?.scoringScaleMax)}>
              {formatScore(averageScoreValue)}
              {scaleSuffixOf(examScale?.scoringScaleMax)}
            </span>
          )}
        />
      </div>

      <div className="mt-3.5 rounded-2xl border border-slate-200 bg-white p-5.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-50 max-w-120 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9.5 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-[13px] text-slate-900 outline-none focus:border-indigo-400"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Tìm theo tên hoặc email..."
              value={search}
            />
          </div>

          <select
            className="h-9.5 rounded-lg border border-slate-200 px-3 text-[13px] text-slate-900 outline-none focus:border-indigo-400"
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            value={statusFilter}
          >
            <option value="ALL">Tất cả trạng thái chấm</option>
            {RESULT_STATUS_FILTER_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getExamResultStatusDisplay(status).label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3.5 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[1.2fr_0.8fr_160px_120px] gap-3 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <span>Thí sinh</span>
            <span>Điểm / xếp loại</span>
            <span>Trạng thái</span>
            <span>Chi tiết</span>
          </div>

          {visibleRows.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400">Không tìm thấy kết quả phù hợp.</div>
          ) : (
            visibleRows.map(({ candidate }) => {
              const attempts = candidate.attempts ?? []
              const statusDisplay = candidate.officialAttempt
                ? getAttemptStatusDisplay(candidate.officialAttempt.status)
                : getPendingRowStatus(candidate.status)
              const isExpanded = expandedCandidates[candidate.id] ?? false

              return (
                <div className="border-t border-slate-100" key={candidate.id}>
                  <div className="grid grid-cols-[1.2fr_0.8fr_160px_120px] items-center gap-3 px-4 py-3">
                    <div>
                      <p className="text-[13px] font-semibold text-slate-900">{getCandidateName(candidate)}</p>
                      <p className="text-xs text-slate-500">{candidate.student?.email ?? candidate.studentId}</p>
                    </div>
                    <ResultBand attempt={candidate.officialAttempt} officialScore={candidate.officialScore} />
                    <span>
                      <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
                    </span>
                    <span>
                      {attempts.length > 0 ? (
                        <button
                          className="inline-flex h-8.5 items-center justify-center gap-1 rounded-full border border-slate-200 px-3 text-xs font-bold text-indigo-600 transition hover:bg-slate-50"
                          onClick={() =>
                            setExpandedCandidates((current) => ({
                              ...current,
                              [candidate.id]: !isExpanded,
                            }))
                          }
                          type="button"
                        >
                          {isExpanded ? 'Ẩn lượt thi' : `Xem ${attempts.length} lượt`}
                          <ChevronDown
                            aria-hidden="true"
                            className={`size-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </span>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-4 pb-4 pt-3">
                      <AttemptRows
                        attempts={attempts}
                        canDelete={canDeleteSessions}
                        deleteBlockedReason={deleteBlockedReason}
                        detailBasePath={detailBasePath}
                        navigate={navigate}
                        officialAttempt={candidate.officialAttempt}
                        officialScore={candidate.officialScore}
                        onDeleteSession={(targetSessionId) => void handleDeleteSession(targetSessionId)}
                      />
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          itemName="kết quả"
          onPageChange={setPage}
          totalElements={filteredRows.length}
          totalPages={totalPages}
        />
      </div>
    </section>
  )
}

function SectionOverview({ result }: { result: ExamCandidateResultDto }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {result.sections.map((section) => (
        <div className="rounded-2xl border border-slate-200 bg-white p-4" key={section.sectionId}>
          <p className="text-sm font-bold text-slate-900">{section.title ?? 'Section'}</p>
          <p className={`mt-2 text-2xl font-extrabold ${getResultScoreTextClass(section.score, result.scoringScaleMin, result.scoringScaleMax)}`}>
            {formatScore(section.score)}
            {scaleSuffix(result)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Điểm quy đổi của phần này</p>
        </div>
      ))}
    </div>
  )
}

/**
 * Bản ghi bài nói của một câu: audio + transcript từng lượt.
 *
 * Tách riêng vì nó phải hiện ở CẢ hai nhánh — câu đã chấm và câu chưa chấm. Trước đây khối
 * này nằm lọt trong nhánh "đã có evaluation", nên bài bị buộc kết thúc rồi gỡ vi phạm không
 * thấy audio lẫn transcript, dù màn chấm vẫn hiện đủ.
 */
function TurnList({ turns }: { turns: ExamItemEvaluationDto['turns'] }) {
  return (
    <div className="grid gap-4">
      {turns.map((turn) => (
        <div className="rounded-xl border border-slate-200 p-4" key={turn.id}>
          <div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                {turn.turnType === 'FOLLOWUP' ? `Follow-up ${turn.turnOrder}` : `Turn ${turn.turnOrder}`}
              </p>
              {turn.promptText ? <p className="mt-1 text-sm leading-6 text-slate-600">{turn.promptText}</p> : null}
            </div>
          </div>

          {turn.audioUrl ? (
            <audio className="mt-3 w-full" controls preload="none" src={turn.audioUrl}>
              Trình duyệt của bạn không hỗ trợ phát âm thanh.
            </audio>
          ) : null}

          <div className="mt-4">
            <WordFeedbackText
              fallbackTranscript={turn.transcript}
              words={Array.isArray(turn.wordFeedback) ? turn.wordFeedback : []}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function QuestionEvaluationCard({
  evaluation,
  itemResult,
  open,
  onToggle,
  questionCode,
  questionText,
  scoringScaleMax,
  scoringScaleMin,
  variant = 'full',
}: {
  evaluation: ExamItemEvaluationDto | null | undefined
  itemResult: ExamCandidateResultDto['items'][number] | undefined
  onToggle: () => void
  /** Thang điểm của rubric, để tô màu theo mức đạt thật. Không truyền thì giữ hành vi cũ. */
  scoringScaleMax?: number | null
  scoringScaleMin?: number | null
  open: boolean
  questionCode?: string | null
  questionText?: string | null
  /**
   * `student` giấu các tín hiệu vận hành (uncertainty, confidence profile, trạng thái
   * bằng chứng, ruleId/severity/action) — học sinh không hành động được gì với chúng và
   * chúng chỉ làm loãng phần thật sự cần đọc. `full` giữ nguyên cho giáo viên/nhà trường.
   */
  variant?: 'full' | 'student'
}) {
  // Sau khi giáo viên chấm lại, bằng chứng AI nằm ở khối `ai` chứ không còn ở bản hiệu
  // lực. Đi qua một chỗ gộp duy nhất để màn học sinh và màn giáo viên không lệch nhau.
  const display = evaluation ? resolveEvaluationDisplay(evaluation) : null
  const validityRules = display ? buildValidityRulesForDisplay(display) : []
  const isStudentView = variant === 'student'
  // Học sinh chỉ đọc được thông điệp đã dịch; rule không có message thì không còn gì để hiện.
  const visibleValidityRules = isStudentView ? validityRules.filter((rule) => rule.message) : validityRules
  // Khi AI chấm và không ai chấm lại, hai trường này là cùng một câu — in hai lần chỉ
  // làm người đọc tưởng có hai nhận xét khác nhau.
  const aiFeedbackDiffers =
    Boolean(display?.aiFeedbackSummary?.trim())
    && display?.aiFeedbackSummary?.trim() !== (evaluation?.feedbackSummary?.trim() ?? '')
  // Màn học sinh không phân biệt nguồn nhận xét: bản có hiệu lực là bản đáng đọc, và
  // khi giáo viên chưa chấm lại thì bản đó vốn đã là của AI.
  const studentFeedback = evaluation?.feedbackSummary?.trim() || display?.aiFeedbackSummary?.trim() || null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
        onClick={onToggle}
        type="button"
      >
        <div>
          <p className="text-sm font-extrabold text-slate-900">{questionCode ?? 'Question'}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{questionText ?? 'Không có nội dung câu hỏi.'}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Câu chưa chấm thì KHÔNG hiện huy hiệu điểm: `formatScore(null)` sẽ in ra một con
              số trông như điểm thật. Thay bằng nhãn nói đúng tình trạng. */}
          {itemResult && itemResult.itemScore != null ? (
            <StatusBadge
              label={`Điểm câu ${formatScore(itemResult.itemScore)}${scaleSuffixOf(scoringScaleMax)}`}
              tone={getResultScoreTone(
                criterionScorePercentage(itemResult.itemScore, scoringScaleMin, scoringScaleMax),
              )}
            />
          ) : null}
          {itemResult && itemResult.weightedScore != null ? (
            <StatusBadge label={`Quy đổi ${formatScore(itemResult.weightedScore)}`} tone="violet" />
          ) : null}
          {itemResult && itemResult.itemScore == null ? (
            <StatusBadge label="Chưa chấm" tone="warning" />
          ) : null}
          <ChevronDown
            aria-hidden="true"
            className={`size-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-4 py-4">
          {/* Tài nguyên đứng TRƯỚC mọi thứ trong thân thẻ: phải biết thí sinh đã nhìn/nghe gì rồi
              mới đọc được transcript và điểm. Nằm ngoài nút gập vì bản thân nó cũng gập được —
              lồng button trong button là HTML không hợp lệ. */}
          {itemResult?.asset ? (
            <QuestionAssetPanel
              altText={itemResult.asset.altText}
              description={itemResult.asset.description}
              durationSeconds={itemResult.asset.durationSeconds}
              title={itemResult.asset.title}
              transcript={itemResult.asset.transcript}
              type={itemResult.asset.type}
              url={itemResult.asset.url}
            />
          ) : null}
          {/* `evaluation.id == null` là tín hiệu "chưa ai chấm câu này" do BE gửi. Không suy từ
              việc thiếu điểm — điểm 0 hợp lệ cũng thiếu điểm theo nghĩa đó. Chưa chấm thì vẫn
              hiện bản ghi bài nói: nó là bằng chứng, không phải điểm. */}
          {!evaluation || evaluation.id == null || !display ? (
            <div className="grid gap-4">
              <p className="text-sm text-slate-400">
                {evaluation && evaluation.turns.length > 0
                  ? 'Câu này chưa được chấm. Dưới đây là bản ghi bài nói của thí sinh.'
                  : 'Chưa có dữ liệu chấm cho câu trả lời này.'}
              </p>
              {evaluation && evaluation.turns.length > 0 ? <TurnList turns={evaluation.turns} /> : null}
            </div>
          ) : (
            <div className="grid gap-5">
              {isStudentView ? (
                studentFeedback ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm leading-6 text-slate-700">{studentFeedback}</p>
                  </div>
                ) : null
              ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={getExamResultStatusDisplay(evaluation.status).label} tone={getExamResultStatusDisplay(evaluation.status).tone} />
                  {display.humanGraded ? <StatusBadge label="Giáo viên chấm lại" tone="violet" /> : null}
                  {display.requiresRetake ? <StatusBadge label="Cần thi lại" tone="danger" /> : null}
                  {display.requiresHumanReview ? <StatusBadge label="Cần giáo viên duyệt lại" tone="warning" /> : null}
                  {/* GỠ: "System uncertainty", "Chưa đủ bằng chứng chấm điểm", nhãn chế độ tin
                      cậy (Profile: High-stakes). Ba nhãn nội bộ của bộ chấm, đứng cạnh nhau
                      thành một hàng chữ mà người chấm không hành động được gì -- và nhãn nào
                      thật sự cần hành động thì đã có "Cần giáo viên duyệt lại" nói rồi. */}
                  {display.markedInvalid ? <StatusBadge label="Đánh dấu không hợp lệ" tone="danger" /> : null}
                  {/* Chỉ hiện con số, không kèm lý do duyệt lại -- khác AiEvaluationSummary bên
                      chấm bài một chút theo yêu cầu ở đây. */}
                  {typeof display.overallConfidence === 'number' ? (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500">
                      <Gauge aria-hidden="true" className="size-3.5 text-slate-400" />
                      Độ tin cậy AI
                      <b className="font-extrabold tabular-nums text-slate-900">
                        {formatConfidencePercent(display.overallConfidence)}
                      </b>
                    </span>
                  ) : null}
                  <span className="text-xs text-slate-500">Chấm lúc {formatDateTime(evaluation.evaluatedAt)}</span>
                  {/* Hai mốc thời gian khác nhau: phán quyết của giáo viên và lần AI phân
                      tích. Gộp làm một là khẳng định sai về thời điểm. */}
                  {display.aiEvaluatedAt ? (
                    <span className="text-xs text-slate-500">· phân tích AI {formatDateTime(display.aiEvaluatedAt)}</span>
                  ) : null}
                </div>
                {/* GỠ: ô "Audio quality", dải "Chưa đủ bằng chứng" và dải cảnh báo alignment.
                    Chúng là số đo NỘI BỘ của bộ chấm, không phải thứ người chấm quyết định
                    được: thấy "độ phủ alignment thấp" thì việc phải làm vẫn y hệt -- nghe lại
                    rồi tự cho điểm. Nhồi cả khối đó lên đầu mỗi câu chỉ đẩy NHẬN XÉT và điểm
                    từng tiêu chí -- thứ thật sự dùng để chấm -- xuống dưới. Dữ liệu vẫn còn
                    nguyên trong `display.signals`, cần thì dựng lại một trang chẩn đoán riêng
                    cho người vận hành, đừng trộn vào màn chấm.
                    "Overall confidence" thì quay lại ở dạng MỘT DÒNG cạnh nhãn trạng thái (như
                    AiEvaluationSummary bên chấm bài) sau khi người chấm yêu cầu có lại -- nó trả
                    lời được câu "vì sao câu này bị đẩy sang cho tôi" khi đi kèm reviewReasonCode,
                    dù bản thân con số không đổi được thao tác. */}
                {evaluation.feedbackSummary ? (
                  <p className="mt-3 text-sm leading-6 text-slate-700">{evaluation.feedbackSummary}</p>
                ) : null}
                {/* Nhận xét của AI để riêng, không trộn vào nhận xét của giáo viên: đây là
                    hai người khác nhau nói về cùng một bài — nhưng chỉ khi họ thật sự nói
                    khác nhau. */}
                {aiFeedbackDiffers ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nhận xét của AI (tham khảo)</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{display.aiFeedbackSummary}</p>
                  </div>
                ) : null}
              </div>
              )}

              <TurnList turns={evaluation.turns} />

              <div className="grid gap-3 md:grid-cols-2">
                {evaluation.criteria.map((criterion) => (
                  <div className="rounded-xl border border-slate-200 bg-white p-4" key={criterion.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold text-slate-900">
                        {criterion.criterionName ?? criterion.criterionCode ?? 'Tiêu chí'}
                      </p>
                      <StatusBadge
                        label={
                          typeof criterion.minScore === 'number' && typeof criterion.maxScore === 'number'
                            ? `${formatScore(criterion.finalScore)} điểm · thang ${formatScore(criterion.minScore)}–${formatScore(criterion.maxScore)}`
                            : `${formatScore(criterion.finalScore)} điểm`
                        }
                        tone={getResultScoreTone(criterionScorePercentage(
                          criterion.finalScore,
                          criterion.minScore,
                          criterion.maxScore,
                        ))}
                      />
                    </div>
                    {criterion.rationale ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">{criterion.rationale}</p>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">Chưa có rationale chi tiết.</p>
                    )}
                  </div>
                ))}
              </div>

              {visibleValidityRules.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle aria-hidden="true" className="size-4 text-amber-600" />
                    <p className="text-sm font-extrabold text-amber-800">Vi phạm quy tắc</p>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {visibleValidityRules.map((rule) => (
                      <div className="rounded-lg border border-amber-200 bg-white px-3 py-2" key={rule.ruleId ?? rule.message ?? 'rule'}>
                        <div className="flex flex-wrap items-center gap-2">
                          {isStudentView ? null : <p className="text-sm font-bold text-slate-900">{rule.ruleId ?? 'Rule'}</p>}
                          {rule.occurrenceCount > 1 ? (
                            <StatusBadge label={`${rule.occurrenceCount} lượt`} tone="warning" />
                          ) : null}
                        </div>
                        {rule?.message ? <p className={`text-sm leading-6 text-slate-600 ${isStudentView && rule.occurrenceCount <= 1 ? '' : 'mt-1'}`}>{rule.message}</p> : null}
                        {isStudentView ? null : (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                            {rule?.severity ? <span>Mức độ: {rule.severity}</span> : null}
                            {rule?.action ? (
                              <span>
                                Hành động:{' '}
                                {display.validity?.validForScoring !== false && rule.action === 'reject_or_zero'
                                  ? 'chỉ áp dụng ở lượt bị gắn cờ; toàn bài vẫn được chấm'
                                  : rule.action}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function ExamResultDetailPage({ gradingPath }: { gradingPath: string }) {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { confirm, confirmWithReason, dialog } = useConfirmationDialog()
  const sessionQuery = useExamSessionStatusQuery(sessionId ?? null)
  const resultQuery = useExamSessionResultQuery(sessionId ?? null)
  // Trang này dùng chung cho school admin và giáo viên, nhưng route học sinh cũng chạm tới
  // được. Xét "KHÔNG phải học sinh" thay vì liệt kê vai được xem: thêm vai mới sau này thì
  // mặc định là xem được, đúng như luật ở backend (chỉ chặn đúng vai STUDENT).
  const currentRoles = useAppSelector((state) => state.auth.user?.roles)
  const canViewRecordings = !currentRoles?.includes('STUDENT')
  const decideOutcomeMutation = useDecideExamCandidateResultOutcomeMutation()
  const forceEndExamSessionMutation = useForceEndExamSessionMutation()
  const retryGradingMutation = useRetryGradingExamSessionMutation()
  const handOffGradingMutation = useHandOffGradingToHumanMutation()
  const session = sessionQuery.data
  const result = resultQuery.data
  const examId = session?.examId ?? result?.examId ?? null
  const candidateId = session?.candidateId ?? result?.candidateId ?? null
  const paperId = session?.paperId ?? result?.paperId ?? null
  const examQuery = useExamQuery(examId)
  const candidatesQuery = useExamCandidatesQuery(examId)
  const candidate = useMemo(
    () => candidatesQuery.data?.find((item) => item.id === candidateId) ?? null,
    [candidateId, candidatesQuery.data],
  )

  const paper = useMemo(
    () => examQuery.data?.papers.find((item) => item.id === paperId) ?? examQuery.data?.papers[0] ?? null,
    [examQuery.data, paperId],
  )
  const itemResultByPaperItemId = useMemo(
    () => new Map((result?.items ?? []).map((item) => [item.paperItemId, item])),
    [result?.items],
  )

  const evaluationQueries = useQueries({
    queries: (result?.items ?? []).map((item) => ({
      enabled: Boolean(item.responseId),
      queryFn: () => fetchExamItemEvaluation(item.responseId),
      queryKey: examResultQueryKeys.evaluation(item.responseId),
      retry: false,
    })),
  })

  const evaluationByResponseId = useMemo(() => {
    const entries = (result?.items ?? []).map((item, index) => [item.responseId, evaluationQueries[index]?.data ?? null] as const)
    return new Map(entries)
  }, [evaluationQueries, result?.items])

  const sectionTabs = useMemo(() => {
    const paperSections = paper?.sections ?? []
    return [
      { label: 'Tổng quan', value: 'overview' },
      ...paperSections.map((section) => ({
        label: section.title ?? `Phần ${section.order}`,
        value: section.id,
      })),
    ]
  }, [paper?.sections])

  const statusDisplay = result ? getExamResultStatusDisplay(result.status) : getAttemptStatusDisplay(session?.status)
  // Giáo viên/nhà trường cần xem điểm và breakdown của PENDING_REVIEW để có căn cứ duyệt.
  // Chỉ ẩn khi backend nói rõ điểm không được phép hiển thị cho user hiện tại.
  const hiddenPendingReview = Boolean(result && result.status === 'PENDING_REVIEW' && !result.scoreVisible)
  // Hai lối ra cho bài AI chấm lỗi -- CHỈ khi bài chưa có kết quả nào.
  //
  // Cần thêm `!result` vì backend cố ý giữ phiên ở GRADING_FAILED sau khi chuyển sang chấm tay
  // (xem HandOffGradingToHumanUseCase: đó là sự thật, AI đã chấm lỗi). Không có chốt này thì bài
  // vừa chuyển xong hiện CẢ BỐN nút, trong đó "Chuyển người chấm" đã vô nghĩa -- bài nằm trong
  // hàng đợi rồi -- và "Chấm lại" thì sẽ ghi điểm AI đè lên bản PENDING_REVIEW mà người chấm
  // đang chờ xử lý.
  //
  // Có kết quả nghĩa là bài đã vào vòng đời chấm: từ đó chỉ còn nhóm nút của trạng thái kết quả.
  const canRetry = session?.status === 'GRADING_FAILED'
    && !result
    && examQuery.data?.status !== 'RESULTS_PUBLISHED'

  if (!sessionId) {
    return null
  }

  if (sessionQuery.isLoading || resultQuery.isLoading) {
    return (
      <section className="mx-auto max-w-240">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
          Đang tải chi tiết kết quả...
        </div>
      </section>
    )
  }

  if (!session) {
    return (
      <section className="mx-auto max-w-240">
        <StatePanel description="Không tìm thấy phiên thi này." title="Không có dữ liệu" tone="info" />
      </section>
    )
  }

  const currentSessionId = session.id

  async function invalidateDetail() {
    await queryClient.invalidateQueries({ queryKey: examResultQueryKeys.all })
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.candidates(examId) })
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.exam(examId) })
  }

  // FINAL: kỳ thi đã RESULTS_PUBLISHED nhưng assessmentPolicy không có passingScore nên
  // backend không tự suy ra được PASSED/FAILED - nhà trường tự chốt thủ công tại đây.
  async function handleDecideOutcome(decision: 'PASSED' | 'FAILED') {
    if (!result) {
      return
    }
    const confirmation = await confirm({
      message:
        decision === 'PASSED'
          ? 'Chốt kết quả này là ĐẬU? Không thể đổi lại sau khi đã chốt.'
          : 'Chốt kết quả này là RỚT? Không thể đổi lại sau khi đã chốt.',
      title: 'Xác nhận chốt đậu/rớt',
    })
    if (!confirmation) {
      return
    }

    try {
      await decideOutcomeMutation.mutateAsync({ candidateResultId: result.id, decision })
      await invalidateDetail()
      setMessage(decision === 'PASSED' ? 'Đã chốt ĐẬU.' : 'Đã chốt RỚT.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể chốt kết quả.')
    }
  }

  // PENDING_REVIEW mà xem lại thấy không ổn (vi phạm quy chế thi) -> vô hiệu ngay, tái dùng
  // đúng forceEndExamSession (tự set blockedAt + chốt INVALID ngay vì session đã GRADED).
  async function handleInvalidatePendingResult() {
    const confirmation = await confirmWithReason({
      message: 'Vô hiệu kết quả này do vi phạm quy chế thi? Điểm sẽ bị huỷ, lượt thi vẫn tính là đã sử dụng.',
      reasonLabel: 'Lý do vô hiệu',
      reasonPlaceholder: 'Nhập lý do nếu cần...',
      title: 'Xác nhận vô hiệu kết quả',
    })
    if (!confirmation.confirmed) {
      return
    }

    try {
      await forceEndExamSessionMutation.mutateAsync({
        reason: confirmation.reason || 'Giáo viên xác nhận vi phạm khi xem lại kết quả chờ duyệt.',
        sessionId: currentSessionId,
      })
      await invalidateDetail()
      setMessage('Đã vô hiệu kết quả.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể vô hiệu kết quả.')
    }
  }

  async function handleRetryGrading() {
    if (!(await confirm({ message: 'Thực hiện chấm lại phiên thi này?', title: 'Xác nhận chấm lại' }))) {
      return
    }

    try {
      await retryGradingMutation.mutateAsync(currentSessionId)
      await invalidateDetail()
      setMessage('Đã gửi yêu cầu chấm lại.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể chấm lại phiên thi.')
    }
  }

  // Lối ra thứ hai khi AI chấm lỗi: đưa bài vào hàng đợi cho người chấm.
  //
  // Backend KHÔNG đổi trạng thái phiên (vẫn GRADING_FAILED) nên nút chấm lại bằng AI vẫn còn đó --
  // hai lối ra cố ý không loại trừ nhau. Cũng không tự chọn giáo viên: bài vào hàng đợi ở dạng
  // CHƯA PHÂN CÔNG để nhà trường tự điều phối.
  async function handleHandOffGrading() {
    if (
      !(await confirm({
        message:
          'Đưa bài này vào hàng đợi cho người chấm? Bài sẽ vào hàng đợi ở dạng chưa phân công, '
          + 'và bạn được chuyển ngay sang màn phân công để chọn giáo viên.',
        title: 'Xác nhận chuyển sang chấm tay',
      }))
    ) {
      return
    }

    try {
      await handOffGradingMutation.mutateAsync(currentSessionId)
      await invalidateDetail()
      // Đi thẳng sang màn phân công, y như nút "Phân công chấm bài" của bài PENDING_REVIEW.
      //
      // Trước đây chỉ hiện toast rồi đứng lại: bài đã vào hàng đợi nhưng người dùng phải tự đi
      // tìm màn phân công, mà việc còn dở của họ CHÍNH LÀ giao bài cho giáo viên. Chuyển bài sang
      // chấm tay mà không giao ai thì chưa xong việc.
      navigate(gradingPath)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể chuyển bài sang chấm tay.')
    }
  }

  return (
    <section className="mx-auto max-w-290">
      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
      {dialog}

      <DetailHeaderCard
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {result?.status === 'PENDING_REVIEW' ? (
              <>
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700"
                  to={gradingPath}
                >
                  Phân công chấm bài
                </Link>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full border border-red-200 px-4 text-sm font-bold text-red-600 transition hover:bg-red-50"
                  onClick={() => void handleInvalidatePendingResult()}
                  type="button"
                >
                  Vô hiệu
                </button>
              </>
            ) : null}
            {result?.status === 'FINAL' ? (
              <>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700"
                  onClick={() => void handleDecideOutcome('PASSED')}
                  type="button"
                >
                  Chốt đậu
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full border border-red-200 px-4 text-sm font-bold text-red-600 transition hover:bg-red-50"
                  onClick={() => void handleDecideOutcome('FAILED')}
                  type="button"
                >
                  Chốt rớt
                </button>
              </>
            ) : null}
            {canRetry ? (
              <>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
                  onClick={() => void handleRetryGrading()}
                  type="button"
                >
                  Chấm lại
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full border border-indigo-200 px-4 text-sm font-bold text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
                  disabled={handOffGradingMutation.isPending}
                  onClick={() => void handleHandOffGrading()}
                  type="button"
                >
                  {handOffGradingMutation.isPending ? 'Đang chuyển...' : 'Chuyển người chấm'}
                </button>
              </>
            ) : null}
          </div>
        }
        metaItems={[
          { icon: <Hash aria-hidden="true" className="size-3.5" />, label: examQuery.data?.code ?? examId ?? session.id },
          { icon: <UserRound aria-hidden="true" className="size-3.5" />, label: getCandidateName(candidate ?? { studentId: candidateId ?? session.candidateId }) },
          { icon: <Target aria-hidden="true" className="size-3.5" />, label: formatPublishedResult(result) },
          { icon: <FileText aria-hidden="true" className="size-3.5" />, label: `Cập nhật ${formatDateTime(examQuery.data?.updatedAt)}` },
          ...(result?.flagged
            ? [{
                icon: <AlertTriangle aria-hidden="true" className="size-3.5 text-amber-600" />,
                label: `Đã đánh dấu nghi vấn${result.flagReason ? `: ${result.flagReason}` : ''}`,
              }]
            : []),
        ]}
        statusLabel={statusDisplay.label}
        statusTone={statusDisplay.tone}
        title={examQuery.data?.name ?? 'Chi tiết kết quả'}
      />

      {hiddenPendingReview ? (
        <div className="mt-5">
          <StatePanel
            description="Điểm số đang được tạm ẩn cho người dùng hiện tại cho tới khi giáo viên đưa ra kết luận cuối cùng."
            title="Đang chờ giáo viên xem xét"
            tone="warning"
          />
        </div>
      ) : null}

      {result?.status === 'PENDING_REVIEW' ? (
        <div className="mt-5">
          <StatePanel
            description="Không còn duyệt lẻ từng bài. Bài ra khỏi hàng chờ theo một trong hai đường: phân công một vòng chấm cho giáo viên (giữ nguyên hoặc chấm lại điểm AI), hoặc chốt sổ hàng loạt cả kỳ thi. Cả hai đều nằm ở màn phân công chấm bài."
            title="Cách xử lý bài chờ soát điểm AI"
            tone="info"
          />
        </div>
      ) : null}

      {!hiddenPendingReview && result ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            <StatCard
              icon={<Gauge size={19} />}
              iconTone="indigo"
              label="Tổng điểm"
              value={(
                <span className={getResultScoreTextClass(result.totalScore, result.scoringScaleMin, result.scoringScaleMax)}>
                  {formatScore(result.totalScore)}
                  {scaleSuffix(result)}
                </span>
              )}
            />
            <StatCard icon={<Target size={19} />} iconTone="violet" label="Xếp loại" value={formatPublishedResult(result)} />
            <StatCard icon={<ClipboardList size={19} />} iconTone="amber" label="Band mục tiêu" value={result.targetFrameworkBandLabel ?? result.targetFrameworkBandCode ?? '-'} />
            <StatCard icon={<Mic2 size={19} />} iconTone="emerald" label="Số câu đã chấm" value={result.items.length} />
          </div>

          <div className="mt-5.5">
            <TabPillGroup items={sectionTabs} onChange={setActiveTab} value={activeTab} />
          </div>

          {activeTab === 'overview' ? (
            <div className="mt-4 grid gap-4">
              <SectionOverview result={result} />

              {/* Bản ghi ca thi -- KHÔNG cho học sinh xem.
                  Backend cũng chặn (query `examRecordingPlayback` chỉ nhận SCHOOL_ADMIN/
                  TEACHER), nhưng chặn thêm ở đây để học sinh không phải thấy một khối tải rồi
                  biến mất. Hai lớp phục vụ hai việc khác nhau: lớp backend là bảo mật, lớp này
                  là giao diện. */}
              {canViewRecordings ? <ExamRecordingPlayer sessionId={sessionId ?? null} /> : null}
            </div>
          ) : null}

          {activeTab !== 'overview' ? (
            <div className="mt-4 grid gap-4">
              {(paper?.sections.find((section) => section.id === activeTab)?.items ?? []).map((item) => {
                const itemResult = itemResultByPaperItemId.get(item.id)
                const evaluation = itemResult ? evaluationByResponseId.get(itemResult.responseId) : null
                const open = expandedItems[item.id] ?? true
                return (
                  <QuestionEvaluationCard
                    scoringScaleMax={result.scoringScaleMax}
                    scoringScaleMin={result.scoringScaleMin}
                    evaluation={evaluation}
                    itemResult={itemResult}
                    key={item.id}
                    onToggle={() => setExpandedItems((current) => ({ ...current, [item.id]: !open }))}
                    open={open}
                    questionCode={item.question?.code}
                    questionText={item.question?.questionText}
                  />
                )
              })}
            </div>
          ) : null}

          {activeTab !== 'overview' && (paper?.sections.find((section) => section.id === activeTab)?.items ?? []).length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400">
              Phần này chưa có câu hỏi để hiển thị.
            </div>
          ) : null}
        </>
      ) : null}

      {!result ? (
        <div className="mt-5">
          {session.status === 'GRADING_FAILED' ? (
            <StatePanel
              description="Phiên thi này đã gặp lỗi trong lúc chấm. Giáo viên có thể chấm lại nếu cần."
              title="Chấm điểm thất bại"
              tone="danger"
            />
          ) : session.status === 'GRADED' ? (
            <StatePanel
              description="Không có câu trả lời nào được ghi nhận cho phiên thi này."
              title="Không có dữ liệu trả lời"
              tone="info"
            />
          ) : session.status === 'EXPIRED' ? (
            <StatePanel
              description="Phiên thi này sẽ được chấm sau khi kỳ thi đóng."
              title="Đang chờ hoãn chấm"
              tone="warning"
            />
          ) : session.status === 'SUBMITTED' || session.status === 'GRADING' ? (
            <StatePanel
              description="Hệ thống đang xử lý kết quả cho phiên thi này."
              title="Đang được chấm điểm"
              tone="info"
            />
          ) : session.status === 'INTERRUPTED' && session.candidateBlocked ? (
            <StatePanel
              description="Phiên thi này đang bị tạm dừng để xem xét."
              title="Đang tạm dừng để xem xét"
              tone="warning"
            />
          ) : session.status === 'IN_PROGRESS' || session.status === 'INTERRUPTED' ? (
            <StatePanel
              description="Học sinh chưa hoàn thành bài thi này."
              title="Chưa hoàn thành bài thi"
              tone="info"
            />
          ) : (
            <StatePanel
              description="Phiên thi này chưa có dữ liệu kết quả để hiển thị."
              title="Chưa có kết quả"
              tone="info"
            />
          )}
        </div>
      ) : null}

      {result && !hiddenPendingReview ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <MessageSquareQuote aria-hidden="true" className="size-4 text-slate-500" />
            <p className="text-sm font-extrabold text-slate-900">Ghi chú hiển thị</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Mỗi từ trong transcript được dựng trực tiếp từ `wordFeedback` để giữ đúng màu lỗi và chi tiết phoneme của dữ liệu.
          </p>
        </div>
      ) : null}
    </section>
  )
}

export function SchoolAdminExamResultsListPage() {
  return <ExamResultsListPage detailBasePath="/school-admin/exam-results" userRole="SCHOOL_ADMIN" />
}

export function TeacherExamResultsListPage() {
  return <ExamResultsListPage detailBasePath="/teacher/exam-results" userRole="TEACHER" />
}

export function SchoolAdminExamResultDetailPage() {
  return <ExamResultDetailPage gradingPath="/school-admin/grading" />
}

export function TeacherExamResultDetailPage() {
  return <ExamResultDetailPage gradingPath="/teacher/grading" />
}

export function SchoolAdminClassTestResultsListPage() {
  const { examId } = useParams()
  return <ExamResultsListPage detailBasePath={`/school-admin/class-tests/${examId}/results`} examIdOverride={examId} title="Kết quả bài trên lớp" userRole="SCHOOL_ADMIN" />
}

export function TeacherClassTestResultsListPage() {
  const { examId } = useParams()
  return <ExamResultsListPage detailBasePath={`/teacher/class-tests/${examId}/results`} examIdOverride={examId} title="Kết quả bài trên lớp" userRole="TEACHER" />
}

export function SchoolAdminClassTestResultDetailPage() {
  const { examId } = useParams()
  return <ExamResultDetailPage gradingPath={`/school-admin/class-tests/${examId}/grading`} />
}

export function TeacherClassTestResultDetailPage() {
  const { examId } = useParams()
  return <ExamResultDetailPage gradingPath={`/teacher/class-tests/${examId}/grading`} />
}
