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
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { examQueryKeys, useExamCandidatesQuery, useExamQuery } from '@/features/examCore/api/queries'
import { formatDateTime, getCandidateName, type ExamAttemptSummaryDto } from '@/features/examCore/types'
import { Pagination } from '@/shared/components/Pagination'
import { AudioReplayButton } from '@/shared/ui/AudioReplayButton'
import { DetailHeaderCard } from '@/shared/ui/DetailHeaderCard'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { TabPillGroup } from '@/shared/ui/TabPill'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { WordFeedbackText } from '@/shared/ui/WordFeedbackText'
import {
  examResultQueryKeys,
  fetchExamItemEvaluation,
  useDeleteExamSessionMutation,
  useExamSessionResultQuery,
  useExamSessionStatusQuery,
  useRetryGradingExamSessionMutation,
  useReviewFlaggedExamResultMutation,
} from '../api/useExamResultQueries'
import {
  formatScore,
  getAttemptStatusDisplay,
  getExamResultStatusDisplay,
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
] as const

function getPendingRowStatus(candidateStatus?: string | null) {
  switch (candidateStatus) {
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

function formatConfidencePercent(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-'
  }

  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

function getReviewReasonLabel(code?: string | null) {
  switch (code) {
    case 'LOW_CONFIDENCE':
      return 'Độ tin cậy AI thấp'
    case 'VALIDITY_FLAGGED':
      return 'Có cảnh báo validity cần giáo viên xem lại'
    default:
      return code ?? null
  }
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
      <p className="text-[13px] font-bold text-slate-900">{formatScore(officialScore)}</p>
      <p className="text-xs text-slate-500">{attempt?.rubricResultBandName ?? attempt?.rubricResultBandCode ?? 'Chưa gán band'}</p>
    </div>
  )
}

function AttemptRows({
  attempts,
  canDelete,
  detailBasePath,
  navigate,
  officialAttempt,
  officialScore,
  onDeleteSession,
}: {
  attempts: ExamAttemptSummaryDto[]
  canDelete: boolean
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
        <span>Điểm / band</span>
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
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">{formatScore(attempt.totalScore)}</p>
              <p className="text-xs text-slate-500">
                {attempt.rubricResultBandName ?? attempt.rubricResultBandCode ?? 'Chưa gán band'}
              </p>
              {isOfficialAttempt ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge label="Chính thức" tone="violet" />
                  {officialScore != null && officialScore !== attempt.totalScore ? (
                    <span className="text-xs text-slate-500">Điểm chính thức: {formatScore(officialScore)}</span>
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
                <button
                  aria-label="Xóa phiên thi này"
                  className="inline-flex size-8.5 items-center justify-center rounded-full border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                  onClick={() => onDeleteSession(attempt.sessionId)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                </button>
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
  userRole,
}: {
  detailBasePath: string
  userRole: ExamResultsUserRole
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const examId = searchParams.get('examId')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [expandedCandidates, setExpandedCandidates] = useState<Record<string, boolean>>({})
  const examQuery = useExamQuery(examId)
  const candidatesQuery = useExamCandidatesQuery(examId)
  const candidates = useMemo(() => candidatesQuery.data ?? [], [candidatesQuery.data])
  const rows = useMemo(() => candidates.map((candidate) => ({ candidate })), [candidates])
  const deleteSessionMutation = useDeleteExamSessionMutation()
  const { confirm, dialog: deleteDialog } = useConfirmationDialog()
  const canDeleteSessions = userRole === 'SCHOOL_ADMIN' || (userRole === 'TEACHER' && examQuery.data?.kind === 'CLASS_TEST')

  async function handleDeleteSession(sessionId: string) {
    if (
      !(await confirm({
        message:
          'Xóa phiên thi này sẽ xóa vĩnh viễn toàn bộ dữ liệu liên quan. Không thể hoàn tác. Bạn có chắc chắn?',
      }))
    ) {
      return
    }

    await deleteSessionMutation.mutateAsync(sessionId)
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
  const averageScore =
    gradedRows.length === 0
      ? '-'
      : formatScore(gradedRows.reduce((sum, row) => sum + (row.candidate.officialScore ?? 0), 0) / gradedRows.length)

  if (!examId) {
    return (
      <section className="mx-auto max-w-240">
        <StatePanel
          description="Trang này cần `examId` để nạp danh sách kết quả."
          title="Kết quả kỳ thi"
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
          <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Kết quả kỳ thi</h1>
          <p className="mt-2 text-[15px] text-slate-500">
            {examQuery.data ? `${examQuery.data.name} • ${examQuery.data.code}` : 'Đang tải thông tin kỳ thi...'}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatCard icon={<UserRound size={19} />} iconTone="indigo" label="Tổng thí sinh" value={rows.length} />
        <StatCard icon={<CheckCircle2 size={19} />} iconTone="emerald" label="Đã có kết quả" value={gradedRows.length} />
        <StatCard icon={<ClipboardList size={19} />} iconTone="amber" label="Chờ chấm" value={pendingReviewCount} />
        <StatCard icon={<Gauge size={19} />} iconTone="violet" label="Điểm trung bình" value={averageScore} />
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
            <span>Điểm / band</span>
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
          <p className="mt-2 text-2xl font-extrabold text-indigo-600">{formatScore(section.score)}</p>
          <p className="mt-1 text-xs text-slate-500">Điểm quy đổi của phần này</p>
        </div>
      ))}
    </div>
  )
}

function QuestionEvaluationCard({
  evaluation,
  itemResult,
  open,
  onToggle,
  questionCode,
  questionText,
}: {
  evaluation: ExamItemEvaluationDto | null | undefined
  itemResult: ExamCandidateResultDto['items'][number] | undefined
  onToggle: () => void
  open: boolean
  questionCode?: string | null
  questionText?: string | null
}) {
  const validityRules = Array.isArray(evaluation?.validity?.ruleResults)
    ? evaluation.validity?.ruleResults?.filter((rule) => rule?.ruleId || rule?.message)
    : []

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
          {itemResult ? <StatusBadge label={`Điểm câu ${formatScore(itemResult.itemScore)}`} tone="info" /> : null}
          {itemResult ? <StatusBadge label={`Quy đổi ${formatScore(itemResult.weightedScore)}`} tone="violet" /> : null}
          <ChevronDown
            aria-hidden="true"
            className={`size-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-4 py-4">
          {!evaluation ? (
            <p className="text-sm text-slate-400">Chưa có evaluation cho câu trả lời này.</p>
          ) : (
            <div className="grid gap-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={getExamResultStatusDisplay(evaluation.status).label} tone={getExamResultStatusDisplay(evaluation.status).tone} />
                  {evaluation.requiresRetake ? <StatusBadge label="Cần thi lại" tone="danger" /> : null}
                  {evaluation.requiresHumanReview ? <StatusBadge label="Cần giáo viên duyệt lại" tone="warning" /> : null}
                  {evaluation.markedInvalid ? <StatusBadge label="Đánh dấu không hợp lệ" tone="danger" /> : null}
                  <span className="text-xs text-slate-500">Chấm lúc {formatDateTime(evaluation.evaluatedAt)}</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Gauge aria-hidden="true" className="size-4" />
                      <span className="text-xs font-bold uppercase tracking-wide">AI confidence</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-900">{formatConfidencePercent(evaluation.signals?.aiConfidence)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mic2 aria-hidden="true" className="size-4" />
                      <span className="text-xs font-bold uppercase tracking-wide">Audio quality</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-900">{formatConfidencePercent(evaluation.signals?.audioQuality)}</p>
                  </div>
                </div>
                {evaluation.requiresHumanReview || evaluation.reviewReasonCode ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                    <div className="flex items-start gap-2">
                      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      <p>{getReviewReasonLabel(evaluation.reviewReasonCode) ?? 'Bài làm cần được giáo viên xem lại trước khi tin cậy hoàn toàn.'}</p>
                    </div>
                  </div>
                ) : null}
                {evaluation.feedbackSummary ? (
                  <p className="mt-3 text-sm leading-6 text-slate-700">{evaluation.feedbackSummary}</p>
                ) : null}
              </div>

              <div className="grid gap-4">
                {evaluation.turns.map((turn) => (
                  <div className="rounded-xl border border-slate-200 p-4" key={turn.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">
                          {turn.turnType === 'FOLLOWUP' ? `Follow-up ${turn.turnOrder}` : `Turn ${turn.turnOrder}`}
                        </p>
                        {turn.promptText ? <p className="mt-1 text-sm leading-6 text-slate-600">{turn.promptText}</p> : null}
                      </div>
                      <AudioReplayButton audioUrl={turn.audioUrl} />
                    </div>

                    <div className="mt-4">
                      <WordFeedbackText
                        fallbackTranscript={turn.transcript}
                        words={Array.isArray(turn.wordFeedback) ? turn.wordFeedback : []}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {evaluation.criteria.map((criterion) => (
                  <div className="rounded-xl border border-slate-200 bg-white p-4" key={criterion.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold text-slate-900">
                        {criterion.criterionName ?? criterion.criterionCode ?? 'Tiêu chí'}
                      </p>
                      <StatusBadge label={`${formatScore(criterion.finalScore)} điểm`} tone="success" />
                    </div>
                    {criterion.rationale ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">{criterion.rationale}</p>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">Chưa có rationale chi tiết.</p>
                    )}
                  </div>
                ))}
              </div>

              {validityRules && validityRules.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle aria-hidden="true" className="size-4 text-amber-600" />
                    <p className="text-sm font-extrabold text-amber-800">Vi phạm quy tắc</p>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {validityRules.map((rule, index) => (
                      <div className="rounded-lg border border-amber-200 bg-white px-3 py-2" key={`${rule?.ruleId ?? 'rule'}-${index}`}>
                        <p className="text-sm font-bold text-slate-900">{rule?.ruleId ?? 'Rule'}</p>
                        {rule?.message ? <p className="mt-1 text-sm leading-6 text-slate-600">{rule.message}</p> : null}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          {rule?.severity ? <span>Mức độ: {rule.severity}</span> : null}
                          {rule?.action ? <span>Hành động: {rule.action}</span> : null}
                        </div>
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

function ExamResultDetailPage() {
  const { sessionId } = useParams()
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { confirm, dialog } = useConfirmationDialog()
  const sessionQuery = useExamSessionStatusQuery(sessionId ?? null)
  const resultQuery = useExamSessionResultQuery(sessionId ?? null)
  const reviewFlaggedResultMutation = useReviewFlaggedExamResultMutation()
  const retryGradingMutation = useRetryGradingExamSessionMutation()
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
  const hiddenPendingReview = Boolean(result && session?.flagged && result.status === 'PENDING_REVIEW')
  const canRetry = session?.status === 'GRADING_FAILED' && examQuery.data?.status !== 'RESULTS_PUBLISHED'

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

  async function handleReview(decision: 'FINAL' | 'INVALID' | 'RETAKE_REQUIRED') {
    const actionMessage =
      decision === 'FINAL'
        ? 'Duyệt kết quả này để tính điểm chính thức cho học sinh?'
        : decision === 'INVALID'
          ? 'Vô hiệu kết quả này? Lượt thi vẫn được tính là đã sử dụng.'
          : 'Yêu cầu thi lại? Học sinh sẽ được thêm một lượt thi mới.'

    if (!(await confirm({ message: actionMessage, title: 'Xác nhận xử lý kết quả' }))) {
      return
    }

    if (!result) {
      return
    }

    try {
      await reviewFlaggedResultMutation.mutateAsync({ candidateResultId: result.id, decision })
      await invalidateDetail()
      setMessage('Đã cập nhật trạng thái kết quả.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái kết quả.')
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

  return (
    <section className="mx-auto max-w-290">
      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
      {dialog}

      <DetailHeaderCard
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {session.flagged && result?.status === 'PENDING_REVIEW' ? (
              <>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700"
                  onClick={() => void handleReview('FINAL')}
                  type="button"
                >
                  Duyệt
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full border border-red-200 px-4 text-sm font-bold text-red-600 transition hover:bg-red-50"
                  onClick={() => void handleReview('INVALID')}
                  type="button"
                >
                  Vô hiệu
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full border border-amber-200 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-50"
                  onClick={() => void handleReview('RETAKE_REQUIRED')}
                  type="button"
                >
                  Yêu cầu thi lại
                </button>
              </>
            ) : null}
            {canRetry ? (
              <button
                className="inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
                onClick={() => void handleRetryGrading()}
                type="button"
              >
                Chấm lại
              </button>
            ) : null}
          </div>
        }
        metaItems={[
          { icon: <Hash aria-hidden="true" className="size-3.5" />, label: examQuery.data?.code ?? examId ?? session.id },
          { icon: <UserRound aria-hidden="true" className="size-3.5" />, label: getCandidateName(candidate ?? { studentId: candidateId ?? session.candidateId }) },
          { icon: <Target aria-hidden="true" className="size-3.5" />, label: result?.rubricResultBandName ?? result?.rubricResultBandCode ?? 'Chưa có band' },
          { icon: <FileText aria-hidden="true" className="size-3.5" />, label: `Cập nhật ${formatDateTime(examQuery.data?.updatedAt)}` },
        ]}
        statusLabel={statusDisplay.label}
        statusTone={statusDisplay.tone}
        title={examQuery.data?.name ?? 'Chi tiết kết quả'}
      />

      {hiddenPendingReview ? (
        <div className="mt-5">
          <StatePanel
            description="Điểm số đang được tạm ẩn cho tới khi giáo viên đưa ra kết luận cuối cùng."
            title="Đang chờ giáo viên xem xét"
            tone="warning"
          />
        </div>
      ) : null}

      {!hiddenPendingReview && result ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            <StatCard icon={<Gauge size={19} />} iconTone="indigo" label="Tổng điểm" value={formatScore(result.totalScore)} />
            <StatCard icon={<Target size={19} />} iconTone="violet" label="Band đạt" value={result.rubricResultBandName ?? result.rubricResultBandCode ?? '-'} />
            <StatCard icon={<ClipboardList size={19} />} iconTone="amber" label="Band mục tiêu" value={result.targetFrameworkBandLabel ?? result.targetFrameworkBandCode ?? '-'} />
            <StatCard icon={<Mic2 size={19} />} iconTone="emerald" label="Số câu đã chấm" value={result.items.length} />
          </div>

          <div className="mt-5.5">
            <TabPillGroup items={sectionTabs} onChange={setActiveTab} value={activeTab} />
          </div>

          {activeTab === 'overview' ? (
            <div className="mt-4">
              <SectionOverview result={result} />
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
  return <ExamResultDetailPage />
}

export function TeacherExamResultDetailPage() {
  return <ExamResultDetailPage />
}
