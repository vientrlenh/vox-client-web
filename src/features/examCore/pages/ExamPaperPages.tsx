import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CircleCheck, Eye, FilePenLine, Pencil, Trash2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { toApiError } from '@/shared/api'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useConfirmationDialog } from '@/shared/ui/ConfirmationDialog'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { QuestionPicker } from '../components/QuestionPicker'
import { examQueryKeys, useExamMyRoleQuery, useExamPaperQuery, useExamQuery } from '../api/queries'
import {
  useDeleteExamPaperMutation,
  useUpdateExamPaperItemMutation,
  useUpdateExamPaperSectionMutation,
  useUpdateExamPaperStatusMutation,
} from '../api/mutations'
import { formatNullableText, getExamPaperStatusDisplay, type ExamMemberRole, type UpdateExamPaperStatusRequest } from '../types'

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

// CHAIR có toàn quyền của REVIEWER (approve/request-revision) ngoài quyền lock/reopen riêng — khớp rule backend.
const ROLE_ACTIONS: Partial<Record<ExamMemberRole, UpdateExamPaperStatusRequest['action'][]>> = {
  AUTHOR: ['SUBMIT'],
  CHAIR: ['APPROVE', 'REQUEST_REVISION', 'LOCK', 'REOPEN'],
  REVIEWER: ['APPROVE', 'REQUEST_REVISION'],
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
  const myRoleQuery = useExamMyRoleQuery(examId)
  const myRole = myRoleQuery.data as ExamMemberRole | null | undefined
  const updateItemMutation = useUpdateExamPaperItemMutation()
  const updateSectionMutation = useUpdateExamPaperSectionMutation()
  const updateStatusMutation = useUpdateExamPaperStatusMutation()
  const deleteMutation = useDeleteExamPaperMutation()
  const { confirm, dialog } = useConfirmationDialog()
  const [pickerItemId, setPickerItemId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [revisionNote, setRevisionNote] = useState<string | null>(null)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editInstruction, setEditInstruction] = useState('')

  const exam = examQuery.data

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  function startEditingSection(sectionId: string, title: string, instruction: string) {
    setEditingSectionId(sectionId)
    setEditTitle(title)
    setEditInstruction(instruction)
  }

  async function handleSaveSection(paperId: string, sectionId: string) {
    try {
      await updateSectionMutation.mutateAsync({
        paperId,
        payload: { instruction: editInstruction.trim() || null, title: editTitle.trim() },
        sectionId,
      })
      await invalidate()
      setEditingSectionId(null)
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleUpdateStatus(paperId: string, action: UpdateExamPaperStatusRequest['action'], note?: string) {
    try {
      await updateStatusMutation.mutateAsync({ paperId, payload: { action, note } })
      await invalidate()
      setRevisionNote(null)
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
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
  const allowedActionsForRole = myRole ? ROLE_ACTIONS[myRole] ?? [] : []
  const nextActions = canManage ? (NEXT_ACTIONS[paper.status] ?? []).filter((action) => allowedActionsForRole.includes(action)) : []
  // Bài trên lớp luôn tạo mã đề ở trạng thái LOCKED (không dùng luồng duyệt) nên LOCKED không chặn sửa ở đây.
  const canEditPaperContent =
    canManage && exam?.status !== 'IN_PROGRESS' && (exam?.kind === 'CLASS_TEST' || paper.status !== 'LOCKED')
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
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />

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
            {editingSectionId === section.id ? (
              <div className="grid gap-2.5">
                <input
                  className="h-9.5 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-900"
                  onChange={(event) => setEditTitle(event.target.value)}
                  value={editTitle}
                />
                <textarea
                  className="min-h-16 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700"
                  onChange={(event) => setEditInstruction(event.target.value)}
                  placeholder="Hướng dẫn phần (không bắt buộc)"
                  value={editInstruction}
                />
                <div className="flex gap-2">
                  <button
                    className="inline-flex h-8.5 items-center justify-center rounded-full bg-indigo-600 px-4 text-xs font-bold text-white disabled:opacity-60"
                    disabled={updateSectionMutation.isPending}
                    onClick={() => void handleSaveSection(paper.id, section.id)}
                    type="button"
                  >
                    Lưu
                  </button>
                  <button
                    className="inline-flex h-8.5 items-center justify-center rounded-full border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    onClick={() => setEditingSectionId(null)}
                    type="button"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-extrabold text-slate-900">{section.title}</h3>
                  {section.instruction ? <p className="mt-1 text-xs text-slate-500">{section.instruction}</p> : null}
                </div>
                {canEditPaperContent ? (
                  <button
                    aria-label={`Sửa phần ${section.title}`}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => startEditingSection(section.id, section.title ?? '', section.instruction ?? '')}
                    title="Sửa tiêu đề/hướng dẫn phần"
                    type="button"
                  >
                    <Pencil aria-hidden="true" className="size-3.5" />
                  </button>
                ) : null}
              </div>
            )}
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
                  {item.question ? (
                    <a
                      aria-label={`Xem chi tiết ${item.question.code}`}
                      className="inline-flex size-8.5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      href={`${canManage ? '/teacher' : '/school-admin'}/questions/${item.question.id}`}
                      rel="noopener noreferrer"
                      target="_blank"
                      title="Xem chi tiết câu hỏi"
                    >
                      <Eye aria-hidden="true" className="size-4" />
                    </a>
                  ) : null}
                  {canEditPaperContent ? (
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
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {nextActions.map((action) => {
            const isIncompleteSubmit = action === 'SUBMIT' && filledItems < totalItems
            return (
              <button
                className="inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-4.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isIncompleteSubmit}
                key={action}
                onClick={() => (action === 'REQUEST_REVISION' ? setRevisionNote('') : void handleUpdateStatus(paper.id, action))}
                title={isIncompleteSubmit ? 'Còn ô câu hỏi chưa được gán — gán đủ trước khi nộp duyệt' : undefined}
                type="button"
              >
                {STATUS_ACTION_LABEL[action]}
              </button>
            )
          })}
          {nextActions.includes('SUBMIT') && filledItems < totalItems ? (
            <span className="text-xs font-semibold text-amber-600">
              Còn {totalItems - filledItems} ô câu hỏi chưa gán
            </span>
          ) : null}
        </div>
      ) : null}

      {revisionNote !== null ? (
        <div className="mt-3.5 grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <label className="text-xs font-bold text-slate-700">Góp ý cho AUTHOR (bắt buộc)</label>
          <textarea
            className="min-h-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            onChange={(event) => setRevisionNote(event.target.value)}
            value={revisionNote}
          />
          <div className="flex justify-end gap-2">
            <button
              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
              onClick={() => setRevisionNote(null)}
              type="button"
            >
              Hủy
            </button>
            <button
              className="inline-flex h-9 items-center justify-center rounded-full bg-amber-600 px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!revisionNote.trim()}
              onClick={() => void handleUpdateStatus(paper.id, 'REQUEST_REVISION', revisionNote.trim())}
              type="button"
            >
              Gửi yêu cầu sửa lại
            </button>
          </div>
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
          publishedOnly={exam?.kind === 'CENTRALIZED'}
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
