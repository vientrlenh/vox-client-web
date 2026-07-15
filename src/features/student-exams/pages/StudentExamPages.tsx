import { ArrowRight, BookOpenCheck, Clock3, Target } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useExamSessionResultQuery, useExamSessionStatusQuery, useMyExamsQuery } from '@/features/exam-results/api/useExamResultQueries'
import { formatScore, getExamResultStatusDisplay, getStudentExamStatusDisplay } from '@/features/exam-results/types'
import { DetailHeaderCard } from '@/shared/ui/DetailHeaderCard'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'

function formatDate(value?: string | null) {
  if (!value) {
    return 'Chua co lich'
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

export function StudentExamsPage() {
  const navigate = useNavigate()
  const examsQuery = useMyExamsQuery()
  const exams = useMemo(() => examsQuery.data ?? [], [examsQuery.data])
  const completedCount = exams.filter((exam) => exam.status === 'completed').length
  const resultReadyCount = exams.filter((exam) => exam.status === 'completed' && exam.sessionId).length

  if (examsQuery.isLoading) {
    return (
      <section className="mx-auto max-w-220">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
          Dang tai danh sach bai thi...
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-220">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Bai thi cua toi</h1>
        <p className="mt-2 text-[15px] text-slate-500">Theo doi lich thi, trang thai va xem ket qua ngay khi bai thi duoc cham xong.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<BookOpenCheck size={19} />} iconTone="indigo" label="Tong bai thi" value={exams.length} />
        <StatCard icon={<Clock3 size={19} />} iconTone="amber" label="Da ket thuc" value={completedCount} />
        <StatCard icon={<Target size={19} />} iconTone="emerald" label="Da co ket qua" value={resultReadyCount} />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[1.2fr_130px_170px_140px] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          <span>Bai thi</span>
          <span>Thoi luong</span>
          <span>Trang thai</span>
          <span>Ket qua</span>
        </div>

        {exams.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Chua co bai thi nao duoc giao cho ban.</div>
        ) : (
          exams.map((exam) => {
            const statusDisplay = getStudentExamStatusDisplay(exam.status)
            const canViewResult = exam.status === 'completed' && Boolean(exam.sessionId)
            return (
              <div className="grid grid-cols-[1.2fr_130px_170px_140px] items-center gap-3 border-t border-slate-100 px-4 py-4" key={exam.id}>
                <div>
                  <p className="text-sm font-bold text-slate-900">{exam.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{exam.subject} • {formatDate(exam.examDate)}</p>
                </div>
                <span className="text-sm text-slate-600">{exam.duration} phut</span>
                <span>
                  <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
                </span>
                <span>
                  {canViewResult ? (
                    <button
                      className="inline-flex h-8.5 items-center justify-center gap-1 rounded-full border border-slate-200 px-3 text-xs font-bold text-indigo-600 transition hover:bg-slate-50"
                      onClick={() => navigate(`/student/exams/${exam.sessionId}/result`)}
                      type="button"
                    >
                      Xem ket qua
                      <ArrowRight aria-hidden="true" className="size-3.5" />
                    </button>
                  ) : exam.status === 'completed' ? (
                    <span className="text-xs font-medium text-slate-400">Da bo lo</span>
                  ) : (
                    <span className="text-xs text-slate-400">Chua mo</span>
                  )}
                </span>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

export function StudentExamResultPage() {
  const { sessionId } = useParams()
  const resultQuery = useExamSessionResultQuery(sessionId ?? null)
  const sessionQuery = useExamSessionStatusQuery(sessionId ?? null)
  const result = resultQuery.data

  if (!sessionId) {
    return null
  }

  if (resultQuery.isLoading) {
    return (
      <section className="mx-auto max-w-180">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
        Đang tải kết quả bài thi...
        </div>
      </section>
    )
  }

  if (!result) {
    if (sessionQuery.data?.status === 'GRADING_FAILED') {
      return (
        <section className="mx-auto max-w-180">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
            <h1 className="text-2xl font-extrabold text-red-900">Chấm điểm thất bại</h1>
            <p className="mt-3 text-sm text-red-700">
              Phiên thi này đã gặp lỗi trong lúc chấm điểm. Vui lòng liên hệ giáo viên hoặc quản trị viên để xử lý lại.
            </p>
            <div className="mt-4 inline-flex">
              <StatusBadge label="Chấm lỗi" tone="danger" />
            </div>
          </div>
        </section>
      )
    }

    return (
      <section className="mx-auto max-w-180">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">Kết quả đang được xử lý</h1>
          <p className="mt-3 text-sm text-slate-500">Bài thi đang được chấm, vui lòng quay lại sau.</p>
        </div>
      </section>
    )
  }

  const statusDisplay = getExamResultStatusDisplay(result.status)

  return (
    <section className="mx-auto max-w-180">
      <DetailHeaderCard
        metaItems={[
          { icon: <BookOpenCheck aria-hidden="true" className="size-3.5" />, label: `Phiên thi ${result.sessionId}` },
          { icon: <Target aria-hidden="true" className="size-3.5" />, label: result.rubricResultBandName ?? result.rubricResultBandCode ?? 'Chưa có band' },
        ]}
        statusLabel={statusDisplay.label}
        statusTone={statusDisplay.tone}
        title="Kết quả bài thi"
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Target size={19} />} iconTone="indigo" label="Tổng điểm" value={formatScore(result.totalScore)} />
        <StatCard icon={<BookOpenCheck size={19} />} iconTone="violet" label="Band đạt" value={result.rubricResultBandName ?? result.rubricResultBandCode ?? '-'} />
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
    </section>
  )
}
