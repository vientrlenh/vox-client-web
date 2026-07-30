import { ArrowRight, BookOpenCheck, ChevronDown, Clock3, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useExamSessionResultQuery, useExamSessionStatusQuery, useMyExamsQuery } from '@/features/exam-results/api/useExamResultQueries'
import {
  formatScore,
  getAttemptStatusDisplay,
  getExamResultStatusDisplay,
  getStudentExamStatusDisplay,
  type StudentExamSessionSummaryDto,
} from '@/features/exam-results/types'
import { DetailHeaderCard } from '@/shared/ui/DetailHeaderCard'
import { formatPublishedResult } from '@/shared/lib/resultScore'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'

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

export function StudentExamsPage() {
  const navigate = useNavigate()
  const examsQuery = useMyExamsQuery()
  const [expandedExamIds, setExpandedExamIds] = useState<Record<string, boolean>>({})
  const exams = useMemo(() => examsQuery.data ?? [], [examsQuery.data])
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
        <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Bài thi của tôi</h1>
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
                        onClick={() => navigate(`/student/exams/${singleSession.sessionId}/result`)}
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
                      onOpenResult={(sessionId) => navigate(`/student/exams/${sessionId}/result`)}
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

export function StudentExamResultPage() {
  const { sessionId } = useParams()
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
        title="Kết quả bài thi"
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
    </section>
  )
}
