import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { QuestionPicker } from '../components/QuestionPicker'
import {
  useCreateExamPaperMutation,
  useDeleteExamPaperMutation,
  useUpdateExamPaperItemMutation,
  useUpdateExamPaperStatusMutation,
} from '../api/useExamMutations'
import { examQueryKeys, useExamBlueprintQuery, useExamQuery } from '../api/useExamQueries'
import type { ExamPaperDto, UpdateExamPaperStatusRequest } from '../types'
import {
  formatNullableText,
  getExamPaperStatusDisplay,
} from '../types'

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Không thể xử lý đề thi.'
}

function PaperStatusBadge({ status }: { status?: string | null }) {
  const display = getExamPaperStatusDisplay(status)
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${display.className}`}>{display.label}</span>
}

function Notice({ children, tone }: { children: ReactNode; tone: 'error' | 'success' }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
      {children}
    </div>
  )
}

function getPaperFromExam(exam: { papers?: ExamPaperDto[] } | null | undefined, paperId?: string) {
  return exam?.papers?.find((paper) => paper.id === paperId) ?? null
}

function getBlockingFixedSlots(version: {
  sections: Array<{
    slots: Array<{
      fixedQuestion?: { status?: string | null } | null
      slotType: string
    }>
  }>
} | null) {
  return version?.sections.flatMap((section) =>
    section.slots.filter(
      (slot) =>
        slot.slotType === 'FIXED' &&
        slot.fixedQuestion &&
        slot.fixedQuestion.status !== 'PUBLISHED',
    ),
  ) ?? []
}

function getBlueprintVersionById(versions?: Array<{
  id: string
  sections: Array<{
    slots: Array<{
      fixedQuestion?: { status?: string | null } | null
      slotType: string
    }>
  }>
}> | null, blueprintVersionId?: string | null) {
  if (!blueprintVersionId) {
    return null
  }

  return versions?.find((version) => version.id === blueprintVersionId) ?? null
}

export function TeacherExamPapersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { examId } = useParams()
  const examQuery = useExamQuery(examId ?? null)
  const exam = examQuery.data
  const blueprintQuery = useExamBlueprintQuery(exam?.blueprintId ?? null)
  const createPaperMutation = useCreateExamPaperMutation()
  const flashMessage =
    (location.state as { successMessage?: string } | null)?.successMessage ?? null
  const [message, setMessage] = useState<string | null>(flashMessage)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!flashMessage) {
      return
    }

    setMessage(flashMessage)
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [flashMessage, location.pathname, location.search, navigate])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  if (examQuery.isLoading) {
    return <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">Đang tải danh sách đề thi...</section>
  }

  if (!exam) {
    return <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Không tìm thấy kỳ thi.</section>
  }

  const finalizedVersion = getBlueprintVersionById(blueprintQuery.data?.versions, exam.blueprintVersionId)
  const blockingFixedSlots = getBlockingFixedSlots(finalizedVersion)
  const canManagePaperActions = Boolean(exam.blueprintVersionId && finalizedVersion) && blockingFixedSlots.length === 0

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600" onClick={() => navigate(-1)} type="button">
            Quay lại
          </button>
          <h1 className="text-3xl font-black text-blue-950">Danh sách đề thi</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Quản lý các mã đề thuộc kỳ thi {exam.code}.
          </p>
        </div>
        <button
          className={`inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-bold text-white ${canManagePaperActions ? 'bg-indigo-600' : 'bg-slate-300'}`}
          disabled={!canManagePaperActions}
          onClick={() => {
            void (async () => {
              if (!canManagePaperActions) {
                return
              }
              try {
                const result = await createPaperMutation.mutateAsync(exam.id)
                await refresh()
                setMessage(result)
                setError(null)
              } catch (submitError) {
                setError(getErrorMessage(submitError))
              }
            })()
          }}
          type="button"
        >
          Tạo đề thi mới
        </button>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />
      {!exam.blueprintVersionId ? (
        <Notice tone="error">
          CHAIR cần chốt blueprint version trước khi tạo đề thi.
        </Notice>
      ) : null}
      {exam.blueprintVersionId && !finalizedVersion ? (
        <Notice tone="error">
          Khong tai duoc version da chot cua exam nay, nen hien tai chi xem duoc tab paper.
        </Notice>
      ) : null}
      {blockingFixedSlots.length ? (
        <Notice tone="error">
          Version da chot dang co slot FIXED tro toi cau hoi chua du dieu kien de sinh paper.
        </Notice>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Đề thi</th>
              <th className="px-4 py-3">Mã đề</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {exam.papers?.map((paper) => (
              <tr key={paper.id}>
                <td className="px-4 py-4 text-sm font-black text-slate-950">{paper.code}</td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">{paper.variant}</td>
                <td className="px-4 py-4"><PaperStatusBadge status={paper.status} /></td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700"
                      onClick={() => navigate(`/teacher/exams/${exam.id}/papers/${paper.id}`)}
                      type="button"
                    >
                      Chi tiết
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function TeacherExamPaperDetailPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { examId, paperId } = useParams()
  const examQuery = useExamQuery(examId ?? null)
  const exam = examQuery.data
  const paper = getPaperFromExam(exam, paperId)
  const blueprintQuery = useExamBlueprintQuery(exam?.blueprintId ?? null)
  const updatePaperStatusMutation = useUpdateExamPaperStatusMutation()
  const deletePaperMutation = useDeleteExamPaperMutation()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  if (examQuery.isLoading) {
    return <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">Đang tải đề thi...</section>
  }

  if (!exam || !paper) {
    return <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Không tìm thấy đề thi.</section>
  }

  const finalizedVersion = getBlueprintVersionById(blueprintQuery.data?.versions, exam.blueprintVersionId)
  const blockingFixedSlots = getBlockingFixedSlots(finalizedVersion)
  const canManagePaperActions = Boolean(exam.blueprintVersionId && finalizedVersion) && blockingFixedSlots.length === 0
  const paperStatusActions: UpdateExamPaperStatusRequest['action'][] = ['SUBMIT', 'APPROVE', 'REQUEST_REVISION', 'LOCK']

  return (
    <section className="grid gap-6">
      <div>
        <button className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600" onClick={() => navigate(-1)} type="button">
          Quay lại
        </button>
        <h1 className="text-3xl font-black text-blue-950">Chi tiết đề thi</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Theo dõi cấu trúc đề thi, trạng thái và thao tác workflow.
        </p>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />
      {!exam.blueprintVersionId ? (
        <Notice tone="error">
          CHAIR cần chốt blueprint version trước khi thao tác đề thi.
        </Notice>
      ) : null}
      {exam.blueprintVersionId && !finalizedVersion ? (
        <Notice tone="error">
          Khong tai duoc version da chot cua exam nay, nen paper hien chi de xem.
        </Notice>
      ) : null}
      {blockingFixedSlots.length ? (
        <Notice tone="error">
          Version da chot dang co slot FIXED tro toi cau hoi chua PUBLISHED, nen cac thao tac voi paper dang bi khoa.
        </Notice>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <p className="text-lg font-black text-slate-950">{paper.code}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">Variant {paper.variant}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PaperStatusBadge status={paper.status} />
          {paper.status === 'DRAFT' ? (
            <button
              className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-bold text-white ${canManagePaperActions ? 'bg-indigo-600' : 'bg-slate-300'}`}
              disabled={!canManagePaperActions}
              onClick={() => navigate(`/teacher/exams/${exam.id}/papers/${paper.id}/edit`)}
              type="button"
            >
              Sửa đề thi
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-black text-slate-950">Workflow đề thi</h2>
        <div className="flex flex-wrap gap-3">
          {paperStatusActions.map((action) => (
            <button
              className={`inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-bold ${canManagePaperActions ? 'border-slate-200 text-slate-700' : 'border-slate-200 text-slate-400'}`}
              disabled={!canManagePaperActions}
              key={action}
              onClick={() => {
                void (async () => {
                  if (!canManagePaperActions) {
                    return
                  }
                  try {
                    const result = await updatePaperStatusMutation.mutateAsync({
                      paperId: paper.id,
                      payload: { action },
                    })
                    await refresh()
                    setMessage(result)
                    setError(null)
                  } catch (submitError) {
                    setError(getErrorMessage(submitError))
                  }
                })()
              }}
              type="button"
            >
              {action}
            </button>
          ))}
          <button
            className={`inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-bold ${canManagePaperActions ? 'border-red-200 text-red-600' : 'border-slate-200 text-slate-400'}`}
            disabled={!canManagePaperActions}
            onClick={() => {
              void (async () => {
                if (!canManagePaperActions) {
                  return
                }
                try {
                  const result = await deletePaperMutation.mutateAsync(paper.id)
                  await refresh()
                  setError(null)
                  navigate(`/teacher/exams/${exam.id}/papers`, {
                    state: { successMessage: result },
                  })
                } catch (submitError) {
                  setError(getErrorMessage(submitError))
                }
              })()
            }}
            type="button"
          >
            Xóa đề thi
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {paper.sections.map((section) => (
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5" key={section.id}>
            <p className="text-sm font-black text-slate-950">
              Phần {section.order}: {formatNullableText(section.title)}
            </p>
            {section.items.map((item) => (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4" key={item.id}>
                <p className="text-sm font-black text-slate-950">Câu {item.order}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {item.question?.code ?? 'Chua gan cau hoi'}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {formatNullableText(item.question?.questionText)}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

export function TeacherExamPaperEditPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { examId, paperId } = useParams()
  const examQuery = useExamQuery(examId ?? null)
  const exam = examQuery.data
  const paper = getPaperFromExam(exam, paperId)
  const blueprintQuery = useExamBlueprintQuery(exam?.blueprintId ?? null)
  const updatePaperItemMutation = useUpdateExamPaperItemMutation()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  if (examQuery.isLoading) {
    return <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">Đang tải màn chỉnh sửa đề thi...</section>
  }

  if (!exam || !paper) {
    return <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Không tìm thấy đề thi.</section>
  }

  const finalizedVersion = getBlueprintVersionById(blueprintQuery.data?.versions, exam.blueprintVersionId)
  const blockingFixedSlots = getBlockingFixedSlots(finalizedVersion)
  const canManagePaperActions = Boolean(exam.blueprintVersionId && finalizedVersion) && blockingFixedSlots.length === 0
  const slotTypeById = new Map(
    (blueprintQuery.data?.versions ?? []).flatMap((version) =>
      version.sections.flatMap((section) =>
        section.slots.map((slot) => [slot.id, slot.slotType] as const),
      ),
    ),
  )

  return (
    <section className="grid gap-6">
      <div>
        <button className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600" onClick={() => navigate(-1)} type="button">
          Quay lại
        </button>
        <h1 className="text-3xl font-black text-blue-950">Sửa đề thi</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Gan cau hoi cho tung item cua paper.
        </p>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />
      {!exam.blueprintVersionId ? (
        <Notice tone="error">
          CHAIR can chot blueprint version truoc khi sua paper.
        </Notice>
      ) : null}
      {exam.blueprintVersionId && !finalizedVersion ? (
        <Notice tone="error">
          Khong tai duoc version da chot cua exam nay, nen man sua paper hien chi de xem.
        </Notice>
      ) : null}
      {blockingFixedSlots.length ? (
        <Notice tone="error">
          Version da chot dang co slot FIXED tro toi cau hoi chua PUBLISHED, nen chua the sua paper.
        </Notice>
      ) : null}

      <div className="grid gap-4">
        {paper.sections.map((section) => (
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5" key={section.id}>
            <p className="text-sm font-black text-slate-950">
              Phần {section.order}: {formatNullableText(section.title)}
            </p>
            {section.items.map((item) => {
              const slotType = slotTypeById.get(item.blueprintSlotId ?? '')
              const canEditItem = canManagePaperActions && slotType !== 'FIXED'

              return (
                <div className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4" key={item.id}>
                  <div>
                    <p className="text-sm font-black text-slate-950">Câu {item.order}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      {slotType ?? 'SELECTION'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-sm font-black text-slate-950">{item.question?.code ?? 'Chua gan cau hoi'}</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">{formatNullableText(item.question?.questionText)}</p>
                  </div>
                  {canEditItem ? (
                    <QuestionPicker
                      allowStatusChange={false}
                      fixedStatus="PUBLISHED"
                      mode="single"
                      onSelect={(question) => {
                        void (async () => {
                          try {
                            const result = await updatePaperItemMutation.mutateAsync({
                              itemId: item.id,
                              paperId: paper.id,
                              payload: { questionId: question.id },
                            })
                            await refresh()
                            setMessage(result)
                            setError(null)
                          } catch (submitError) {
                            setError(getErrorMessage(submitError))
                          }
                        })()
                      }}
                      selectedQuestionIds={item.question?.id ? [item.question.id] : []}
                      title="Chọn câu hỏi đã xuất bản"
                    />
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">
                      Slot FIXED chi xem, khong sua tren paper.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
