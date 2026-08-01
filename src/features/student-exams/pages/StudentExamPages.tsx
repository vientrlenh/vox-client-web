import { ArrowRight, BookOpenCheck, ChevronDown, Clock3, Send, Target, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useExamItemEvaluationQuery, useExamSessionResultQuery, useExamSessionStatusQuery, useMyExamsQuery } from '@/features/exam-results/api/useExamResultQueries'
import { QuestionEvaluationCard } from '@/features/exam-results/pages/ExamResultPages'
import {
  formatScore,
  getAttemptStatusDisplay,
  getExamResultStatusDisplay,
  getStudentExamStatusDisplay,
  type ExamResultItemDto,
  type StudentExamSessionSummaryDto,
} from '@/features/exam-results/types'
import { DetailHeaderCard } from '@/shared/ui/DetailHeaderCard'
import { formatPublishedResult } from '@/shared/lib/resultScore'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { toApiError } from '@/shared/api'
import { useCreateStudentAppealMutation } from '../api/useStudentAppealQueries'

type StudentExamKind = 'CENTRALIZED' | 'CLASS_TEST'

function formatDate(value?: string | null) {
  if (!value) {
    return 'Chưa có lịch'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function AttemptList({
  sessions,
  onOpenResult,
}: {
  sessions: StudentExamSessionSummaryDto[]
  onOpenResult: (sessionId: string) => void
}) {
  const sortedSessions = useMemo(
    () => [...sessions].sort((left, right) => right.attemptNumber - left.attemptNumber),
    [sessions],
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="grid gap-2">
        {sortedSessions.map((session) => {
          const statusDisplay = getAttemptStatusDisplay(session.status)
          return (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
              key={session.sessionId}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Lượt {session.attemptNumber}</span>
                <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
                {session.flagged ? <StatusBadge label="Chờ xem xét" tone="warning" /> : null}
              </div>
              <button
                className="inline-flex h-8.5 items-center justify-center gap-1 rounded-full border border-slate-200 px-3 text-xs font-bold text-indigo-600 transition hover:bg-slate-50"
                onClick={() => onOpenResult(session.sessionId)}
                type="button"
              >
                Xem kết quả
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StudentExamsPageCore({
  detailBasePath,
  kind,
  title,
}: {
  detailBasePath: string
  kind: StudentExamKind
  title: string
}) {
  const navigate = useNavigate()
  const examsQuery = useMyExamsQuery()
  const [expandedExamIds, setExpandedExamIds] = useState<Record<string, boolean>>({})
  const exams = useMemo(() => (examsQuery.data ?? []).filter((exam) => exam.kind === kind), [examsQuery.data, kind])
  const completedCount = exams.filter((exam) => exam.status === 'completed').length
  const attemptCount = exams.reduce((sum, exam) => sum + exam.sessions.length, 0)

  if (examsQuery.isLoading) {
    return (
      <section className="mx-auto max-w-220">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
          Đang tải danh sách bài thi...
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-220">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-[15px] text-slate-500">
          Theo dõi lịch thi, trạng thái và từng lượt làm bài của bạn.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<BookOpenCheck size={19} />} iconTone="indigo" label="Tổng bài thi" value={exams.length} />
        <StatCard icon={<Clock3 size={19} />} iconTone="amber" label="Đã kết thúc" value={completedCount} />
        <StatCard icon={<Target size={19} />} iconTone="emerald" label="Tổng lượt đã tạo" value={attemptCount} />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[1.2fr_130px_170px_180px] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          <span>Bài thi</span>
          <span>Thời lượng</span>
          <span>Trạng thái</span>
          <span>Lượt thi</span>
        </div>

        {exams.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Chưa có bài thi nào được giao cho bạn.</div>
        ) : (
          exams.map((exam) => {
            const statusDisplay = getStudentExamStatusDisplay(exam.status)
            const isExpanded = expandedExamIds[exam.id] ?? false
            const singleSession = exam.sessions.length === 1 ? exam.sessions[0] : null

            return (
              <div className="border-t border-slate-100" key={exam.id}>
                <div className="grid grid-cols-[1.2fr_130px_170px_180px] items-center gap-3 px-4 py-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{exam.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{exam.subject} • {formatDate(exam.examDate)}</p>
                  </div>
                  <span className="text-sm text-slate-600">{exam.duration} phút</span>
                  <span>
                    <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
                  </span>
                  <span>
                    {exam.sessions.length > 1 ? (
                      <button
                        className="inline-flex h-8.5 items-center justify-center gap-1 rounded-full border border-slate-200 px-3 text-xs font-bold text-indigo-600 transition hover:bg-slate-50"
                        onClick={() =>
                          setExpandedExamIds((current) => ({
                            ...current,
                            [exam.id]: !isExpanded,
                          }))
                        }
                        type="button"
                      >
                        Xem {exam.sessions.length} lượt
                        <ChevronDown
                          aria-hidden="true"
                          className={`size-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    ) : singleSession ? (
                      <button
                        className="inline-flex h-8.5 items-center justify-center gap-1 rounded-full border border-slate-200 px-3 text-xs font-bold text-indigo-600 transition hover:bg-slate-50"
                        onClick={() => navigate(`${detailBasePath}/${singleSession.sessionId}/result`)}
                        type="button"
                      >
                        Xem kết quả
                        <ArrowRight aria-hidden="true" className="size-3.5" />
                      </button>
                    ) : exam.status === 'completed' ? (
                      <span className="text-xs font-medium text-slate-400">Đã bỏ lỡ</span>
                    ) : (
                      <span className="text-xs text-slate-400">Chưa có lượt</span>
                    )}
                  </span>
                </div>

                {isExpanded ? (
                  <div className="px-4 pb-4">
                    <AttemptList
                      onOpenResult={(sessionId) => navigate(`${detailBasePath}/${sessionId}/result`)}
                      sessions={exam.sessions}
                    />
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

export function StudentExamsPage() {
  return <StudentExamsPageCore detailBasePath="/student/exams" kind="CENTRALIZED" title="Bài kiểm tra của tôi" />
}

export function StudentClassTestsPage() {
  return <StudentExamsPageCore detailBasePath="/student/class-tests" kind="CLASS_TEST" title="Bài tập của tôi" />
}

function ResultStatePanel({
  description,
  tone,
  title,
}: {
  description: string
  tone: 'danger' | 'info' | 'warning'
  title: string
}) {
  const toneClassName =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-900'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-slate-200 bg-white text-slate-900'

  const descriptionClassName = tone === 'danger' ? 'text-red-700' : tone === 'warning' ? 'text-amber-700' : 'text-slate-500'

  return (
    <div className={`rounded-2xl border px-6 py-12 text-center ${toneClassName}`}>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className={`mt-3 text-sm ${descriptionClassName}`}>{description}</p>
    </div>
  )
}

function StudentQuestionEvaluation({ item, index }: { item: ExamResultItemDto; index: number }) {
  const [open, setOpen] = useState(false)
  const evaluationQuery = useExamItemEvaluationQuery(open ? item.responseId : null)
  const prompt = evaluationQuery.data?.turns.find((turn) => turn.promptText)?.promptText
  return (
    <QuestionEvaluationCard
      evaluation={evaluationQuery.data}
      itemResult={item}
      onToggle={() => setOpen((current) => !current)}
      open={open}
      questionCode={`Câu ${index + 1}`}
      questionText={prompt ?? (open && evaluationQuery.isLoading ? 'Đang tải chi tiết câu hỏi...' : undefined)}
    />
  )
}

function AppealForm({
  items,
  onClose,
  onSuccess,
  resultId,
}: {
  items: ExamResultItemDto[]
  onClose: () => void
  onSuccess: () => void
  resultId: string
}) {
  const mutation = useCreateStudentAppealMutation()
  const [selectedIds, setSelectedIds] = useState(() => new Set<string>())
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const normalizedReason = reason.trim()
    if (selectedIds.size === 0) {
      setError('Vui lòng chọn ít nhất một câu cần phúc khảo.')
      return
    }
    if (!normalizedReason) {
      setError('Vui lòng nhập lý do phúc khảo.')
      return
    }
    try {
      setError(null)
      await mutation.mutateAsync({
        candidateResultId: resultId,
        notes: notes.trim() || undefined,
        paperItemIds: [...selectedIds],
        reason: normalizedReason,
      })
      onSuccess()
    } catch (caught) {
      setError(toApiError(caught).message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <div aria-modal="true" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl" role="dialog">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold text-slate-900">Gửi đơn phúc khảo</h2><button aria-label="Đóng" className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-slate-100" onClick={onClose} type="button"><X className="size-4" /></button></div>
        <fieldset className="mt-5"><legend className="text-sm font-bold text-slate-800">Câu cần phúc khảo</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{items.map((item, index) => <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700" key={item.paperItemId}><input checked={selectedIds.has(item.paperItemId)} className="size-4 accent-cyan-600" onChange={(event) => setSelectedIds((current) => { const next = new Set(current); if (event.target.checked) next.add(item.paperItemId); else next.delete(item.paperItemId); return next })} type="checkbox" />Câu {index + 1}</label>)}</div></fieldset>
        <label className="mt-5 block text-sm font-bold text-slate-800">Lý do<span className="text-red-600"> *</span><textarea className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" maxLength={512} onChange={(event) => setReason(event.target.value)} value={reason} /></label>
        <label className="mt-4 block text-sm font-bold text-slate-800">Ghi chú<textarea className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" maxLength={512} onChange={(event) => setNotes(event.target.value)} value={notes} /></label>
        {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-3"><button className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700" onClick={onClose} type="button">Hủy</button><button className="inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white hover:bg-cyan-700 disabled:opacity-60" disabled={mutation.isPending} onClick={submit} type="button"><Send className="size-4" />{mutation.isPending ? 'Đang gửi...' : 'Gửi đơn'}</button></div>
      </div>
    </div>
  )
}

function StudentExamResultPageCore({ title }: { title: string }) {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [appealOpen, setAppealOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const sessionQuery = useExamSessionStatusQuery(sessionId ?? null)
  const resultQuery = useExamSessionResultQuery(sessionId ?? null)
  const session = sessionQuery.data
  const result = resultQuery.data

  if (!sessionId) {
    return null
  }

  if (sessionQuery.isLoading || resultQuery.isLoading) {
    return (
      <section className="mx-auto max-w-180">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
          Đang tải kết quả bài thi...
        </div>
      </section>
    )
  }

  if (!session) {
    return (
      <section className="mx-auto max-w-180">
        <ResultStatePanel
          description="Không tìm thấy phiên thi này hoặc bạn không có quyền xem."
          title="Không có dữ liệu"
          tone="info"
        />
      </section>
    )
  }

  const resultHiddenForReview = Boolean(result && session.flagged && result.status === 'PENDING_REVIEW')
  const resultInvalid = Boolean(result && result.status === 'INVALID')
  const headerStatus = result ? getExamResultStatusDisplay(result.status) : getAttemptStatusDisplay(session.status)

  return (
    <section className="mx-auto max-w-180">
      <DetailHeaderCard
        metaItems={[
          { icon: <BookOpenCheck aria-hidden="true" className="size-3.5" />, label: `Phiên thi ${session.id}` },
          {
            icon: <Target aria-hidden="true" className="size-3.5" />,
            label: formatPublishedResult(result),
          },
        ]}
        statusLabel={headerStatus.label}
        statusTone={headerStatus.tone}
        title={title}
      />

      {resultHiddenForReview ? (
        <div className="mt-5">
          <ResultStatePanel
            description="Bài thi của bạn đang chờ giáo viên xem xét trước khi công bố kết quả."
            title="Đang chờ giáo viên xem xét"
            tone="warning"
          />
        </div>
      ) : null}

      {!resultHiddenForReview && resultInvalid ? (
        <div className="mt-5">
          <ResultStatePanel
            description="Bài thi của bạn không hợp lệ do vi phạm quy chế thi. Vui lòng liên hệ giám thị/nhà trường nếu có thắc mắc."
            title="Bài thi không hợp lệ"
            tone="danger"
          />
        </div>
      ) : null}

      {!resultHiddenForReview && !resultInvalid && result ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <StatCard icon={<Target size={19} />} iconTone="indigo" label="Tổng điểm" value={formatScore(result.totalScore)} />
            <StatCard
              icon={<BookOpenCheck size={19} />}
              iconTone="violet"
              label="Xếp loại"
              value={formatPublishedResult(result)}
            />
            <StatCard icon={<Clock3 size={19} />} iconTone="amber" label="Số phần đã chấm" value={result.sections.length} />
          </div>

          <div className="mt-5 grid gap-3">
            {result.sections.map((section) => (
              <div className="rounded-2xl border border-slate-200 bg-white p-4" key={section.sectionId}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{section.title ?? 'Phần thi'}</p>
                    <p className="mt-1 text-xs text-slate-500">Điểm đạt được ở phần này</p>
                  </div>
                  <p className="text-2xl font-extrabold text-indigo-600">{formatScore(section.score)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7">
            <h2 className="text-lg font-extrabold text-slate-900">Chi tiết từng câu</h2>
            <div className="mt-3 grid gap-3">
              {result.items.map((item, index) => <StudentQuestionEvaluation index={index} item={item} key={item.paperItemId} />)}
            </div>
          </div>

          {result.status === 'RELEASED' ? (
            <div className="mt-6 flex justify-end">
              <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white hover:bg-cyan-700" onClick={() => setAppealOpen(true)} type="button"><Send className="size-4" />Gửi đơn phúc khảo</button>
            </div>
          ) : null}
        </>
      ) : null}

      {!result && !resultHiddenForReview ? (
        <div className="mt-5">
          {session.status === 'GRADING_FAILED' ? (
            <ResultStatePanel
              description="Phiên thi này đã gặp lỗi trong lúc chấm điểm. Giáo viên sẽ xử lý, bạn không cần làm gì thêm."
              title="Chấm điểm thất bại"
              tone="danger"
            />
          ) : session.status === 'GRADED' ? (
            <ResultStatePanel
              description="Không có câu trả lời nào được ghi nhận cho lượt thi này."
              title="Không có dữ liệu trả lời"
              tone="info"
            />
          ) : session.status === 'EXPIRED' ? (
            <ResultStatePanel
              description="Bài thi đang chờ kỳ thi kết thúc để được chấm điểm."
              title="Đang chờ chấm sau khi đóng kỳ thi"
              tone="warning"
            />
          ) : session.status === 'SUBMITTED' || session.status === 'GRADING' ? (
            <ResultStatePanel
              description="Bài thi của bạn đang được chấm điểm. Vui lòng quay lại sau."
              title="Đang được chấm điểm"
              tone="info"
            />
          ) : session.status === 'INTERRUPTED' && session.candidateBlocked ? (
            <ResultStatePanel
              description="Bài thi của bạn đang tạm dừng để xem xét, vui lòng liên hệ giám thị hoặc nhà trường."
              title="Đang tạm dừng để xem xét"
              tone="warning"
            />
          ) : session.status === 'IN_PROGRESS' || session.status === 'INTERRUPTED' ? (
            <ResultStatePanel
              description="Bạn chưa hoàn thành bài thi này."
              title="Chưa hoàn thành bài thi"
              tone="info"
            />
          ) : (
            <ResultStatePanel
              description="Kết quả bài thi hiện chưa sẵn sàng."
              title="Chưa có kết quả"
              tone="info"
            />
          )}
        </div>
      ) : null}

      {appealOpen && result ? <AppealForm items={result.items} onClose={() => setAppealOpen(false)} onSuccess={() => { setAppealOpen(false); setSuccessMessage('Đã gửi đơn phúc khảo.'); window.setTimeout(() => navigate('/student/appeals'), 500) }} resultId={result.id} /> : null}
      <FeedbackToast message={successMessage} onClose={() => setSuccessMessage(null)} tone="success" />
    </section>
  )
}

export function StudentExamResultPage() {
  return <StudentExamResultPageCore title="Kết quả bài kiểm tra" />
}

export function StudentClassTestResultPage() {
  return <StudentExamResultPageCore title="Kết quả bài tập" />
}
