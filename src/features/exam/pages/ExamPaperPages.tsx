import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CircleCheck, FilePenLine, Trash2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useConfirmationDialog } from '@/shared/ui/ConfirmationDialog'
import { QuestionPicker } from '../components/QuestionPicker'
import { examQueryKeys, useExamPaperQuery, useExamQuery } from '../api/useExamQueries'
import {
  useDeleteExamPaperMutation,
  useUpdateExamPaperItemMutation,
  useUpdateExamPaperStatusMutation,
} from '../api/useExamMutations'
import { formatNullableText, getExamPaperStatusDisplay, type UpdateExamPaperStatusRequest } from '../types'

const STATUS_ACTION_LABEL: Record<UpdateExamPaperStatusRequest['action'], string> = {
  APPROVE: 'Duyệt mã đề',
  LOCK: 'Khóa mã đề',
  REOPEN: 'Mở lại mã đề',
  REQUEST_REVISION: 'Yêu cầu sửa lại',
  SUBMIT: 'Nộp duyệt',
}

const NEXT_ACTIONS: Partial<Record<string, UpdateExamPaperStatusRequest['action'][]>> = {
  APPROVED: ['LOCK'],
  DRAFT: ['SUBMIT'],
  IN_REVIEW: ['APPROVE', 'REQUEST_REVISION'],
  LOCKED: ['REOPEN'],
}

type ExamPaperPageLocationState = {
  examId?: string
  paperId?: string
}

type ExamPaperPageProps = {
  canManage: boolean
}

function ExamPaperPage({ canManage }: ExamPaperPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { paperId } = useParams()
  const queryClient = useQueryClient()
  const state = (location.state ?? {}) as ExamPaperPageLocationState
  const resolvedPaperId = paperId ?? state.paperId ?? null
  const paperQuery = useExamPaperQuery(resolvedPaperId)
  const paper = paperQuery.data ?? null
  // state.examId chỉ là fast-path (khởi động song song useExamQuery lúc điều hướng trong app);
  // khi F5/dán thẳng URL thì state rỗng, paper.examId (từ server) tự thay thế — không còn phụ thuộc bắt buộc.
  const examId = paper?.examId ?? state.examId ?? null
  const examQuery = useExamQuery(examId)
  const updateItemMutation = useUpdateExamPaperItemMutation()
  const updateStatusMutation = useUpdateExamPaperStatusMutation()
  const deleteMutation = useDeleteExamPaperMutation()
  const { confirm, dialog } = useConfirmationDialog()
  const [pickerItemId, setPickerItemId] = useState<string | null>(null)

  const exam = examQuery.data

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  if (paperQuery.isLoading) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải…</section>
  }

  if (!paper) {
    return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Không tìm thấy mã đề.</section>
  }

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
      {dialog}

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

      {canManage && paper.status === 'DRAFT' ? (
        <div className="mt-3">
          <button
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-red-200 px-4 text-xs font-bold text-red-600 hover:bg-red-50"
            onClick={() => {
              void (async () => {
                if (!(await confirm({ message: 'Bạn có chắc muốn xóa mã đề này không?' }))) {
                  return
                }
                await deleteMutation.mutateAsync(paper.id)
                await invalidate()
                if (backPath) {
                  navigate(backPath)
                } else {
                  navigate(-1)
                }
              })()
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Xóa mã đề
          </button>
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
          publishedOnly
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
