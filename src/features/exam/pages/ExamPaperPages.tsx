import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CircleCheck, FilePenLine } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { QuestionPicker } from '../components/QuestionPicker'
import { examQueryKeys, useExamPaperQuery, useExamQuery } from '../api/useExamQueries'
import { useUpdateExamPaperItemMutation, useUpdateExamPaperStatusMutation } from '../api/useExamMutations'
import { formatNullableText, getExamPaperStatusDisplay, type UpdateExamPaperStatusRequest } from '../types'
import { StatusBadge } from '@/shared/ui/StatusBadge'

const STATUS_ACTION_LABEL: Record<UpdateExamPaperStatusRequest['action'], string> = {
  APPROVE: 'Duyệt mã đề',
  LOCK: 'Khóa mã đề',
  REQUEST_REVISION: 'Yêu cầu sửa lại',
  SUBMIT: 'Nộp duyệt',
}

const NEXT_ACTIONS: Partial<Record<string, UpdateExamPaperStatusRequest['action'][]>> = {
  APPROVED: ['LOCK'],
  DRAFT: ['SUBMIT'],
  IN_REVIEW: ['APPROVE', 'REQUEST_REVISION'],
}

type ExamPaperPageProps = {
  canManage: boolean
}

function ExamPaperPage({ canManage }: ExamPaperPageProps) {
  const navigate = useNavigate()
  const { paperId } = useParams()
  const queryClient = useQueryClient()
  const paperQuery = useExamPaperQuery(paperId ?? null)
  const paper = paperQuery.data
  const examQuery = useExamQuery(paper?.examId ?? null)
  const updateItemMutation = useUpdateExamPaperItemMutation()
  const updateStatusMutation = useUpdateExamPaperStatusMutation()
  const [pickerItemId, setPickerItemId] = useState<string | null>(null)

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  if (paperQuery.isLoading) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải…</section>
  }

  if (!paper) {
    return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Không tìm thấy mã đề.</section>
  }

  const exam = examQuery.data
  const backPath = exam
    ? exam.kind === 'CLASS_TEST'
      ? canManage
        ? `/teacher/class-tests/${exam.id}`
        : `/school-admin/class-tests/${exam.id}`
      : canManage
        ? `/teacher/exams/${exam.id}`
        : `/school-admin/exams/${exam.id}`
    : null

  const statusDisplay = getExamPaperStatusDisplay(paper.status)
  const totalItems = paper.sections.reduce((sum, section) => sum + section.items.length, 0)
  const filledItems = paper.sections.reduce(
    (sum, section) => sum + section.items.filter((item) => item.questionId).length,
    0,
  )
  const nextActions = canManage ? NEXT_ACTIONS[paper.status] ?? [] : []
  const existingQuestionIds = paper.sections
    .flatMap((section) => section.items.map((item) => item.questionId))
    .filter(Boolean) as string[]

  return (
    <section className="mx-auto max-w-220">
      <button
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600"
        onClick={() => (backPath ? navigate(backPath) : navigate(-1))}
        type="button"
      >
        ← Quay lại
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <FilePenLine aria-hidden="true" className="size-5.5" />
          </span>
          <div>
            <div className="text-lg font-extrabold text-slate-900">
              {paper.code} · Mã đề {paper.variant}
            </div>
            <div className="text-sm text-slate-500">
              {filledItems}/{totalItems} câu hỏi đã gán · {paper.sections.length} phần
            </div>
          </div>
        </div>
        <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
      </div>

      <div className="mt-4 grid gap-3.5">
        {paper.sections.map((section) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-5.5" key={section.id}>
            <h3 className="text-[15px] font-extrabold text-slate-900">{section.title}</h3>
            {section.instruction ? <p className="mt-1 text-xs text-slate-500">{section.instruction}</p> : null}
            <div className="mt-3.5 grid gap-2.5">
              {section.items.map((item) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5"
                  key={item.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      {item.order}.{' '}
                      {item.question ? (
                        <>
                          {item.question.code}
                          <CircleCheck aria-hidden="true" className="size-4 text-emerald-600" />
                        </>
                      ) : (
                        <span className="text-amber-700">Chưa gán câu hỏi</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-500">{formatNullableText(item.question?.questionText)}</p>
                  </div>
                  {canManage ? (
                    <button
                      className="inline-flex h-8.5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-indigo-600 hover:bg-slate-50"
                      onClick={() => setPickerItemId(item.id)}
                      type="button"
                    >
                      {item.question ? 'Đổi câu hỏi' : 'Gán câu hỏi'}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {nextActions.length ? (
        <div className="mt-5 flex flex-wrap gap-2.5">
          {nextActions.map((action) => (
            <button
              className="inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-4.5 text-sm font-bold text-white hover:bg-indigo-700"
              key={action}
              onClick={() =>
                void updateStatusMutation.mutateAsync({ paperId: paper.id, payload: { action } }).then(() => invalidate())
              }
              type="button"
            >
              {STATUS_ACTION_LABEL[action]}
            </button>
          ))}
        </div>
      ) : null}

      {pickerItemId ? (
        <QuestionPicker
          onClose={() => setPickerItemId(null)}
          onSelect={(question) => {
            void updateItemMutation
              .mutateAsync({ itemId: pickerItemId, paperId: paper.id, payload: { questionId: question.id } })
              .then(() => invalidate())
              .then(() => setPickerItemId(null))
          }}
          scope="teacher"
          selectedQuestionIds={existingQuestionIds}
        />
      ) : null}
    </section>
  )
}

export function TeacherExamPaperEditPage() {
  return <ExamPaperPage canManage />
}

export function SchoolAdminExamPaperViewPage() {
  return <ExamPaperPage canManage={false} />
}
