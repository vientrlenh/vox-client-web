import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Columns2, FilePenLine, Shuffle } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatusBadge as SharedStatusBadge } from '@/shared/ui/StatusBadge'
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
  return <SharedStatusBadge label={display.label} tone={display.tone} />
}

function Notice({ children, tone }: { children: ReactNode; tone: 'error' | 'success' }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
      {children}
    </div>
  )
}

function PaperComparePanel({
  compareWithId,
  currentPaper,
  onSelectCompareWith,
  otherPapers,
}: {
  compareWithId: string | null
  currentPaper: ExamPaperDto
  onSelectCompareWith: (paperId: string) => void
  otherPapers: ExamPaperDto[]
}) {
  const compareWith = useMemo(
    () => otherPapers.find((candidate) => candidate.id === compareWithId) ?? otherPapers[0] ?? null,
    [compareWithId, otherPapers],
  )

  if (!compareWith) {
    return null
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <Columns2 className="text-indigo-600" size={18} />
          So sánh mã đề
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">So với</span>
          {otherPapers.map((candidate) => (
            <button
              className={`h-7.5 rounded-full border px-3 text-xs font-bold ${
                candidate.id === compareWith.id ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'
              }`}
              key={candidate.id}
              onClick={() => onSelectCompareWith(candidate.id)}
              type="button"
            >
              {candidate.code}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className="h-3.5 w-3.5 rounded border border-amber-300 bg-amber-100" />
        Ô được tô vàng = hai mã đề dùng câu hỏi khác nhau ở cùng vị trí.
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <PaperCompareColumn label={`${currentPaper.code} (đang xem)`} otherPaper={compareWith} paper={currentPaper} />
        <PaperCompareColumn label={compareWith.code} otherPaper={currentPaper} paper={compareWith} />
      </div>
    </div>
  )
}

function PaperCompareColumn({ label, otherPaper, paper }: { label: string; otherPaper: ExamPaperDto; paper: ExamPaperDto }) {
  return (
    <div>
      <div className="mb-2.5 border-b-2 border-indigo-50 pb-2 text-sm font-extrabold text-indigo-600">{label}</div>
      {paper.sections.map((section) => {
        const otherSection = otherPaper.sections.find((candidate) => candidate.order === section.order)
        return (
          <div key={section.id}>
            <div className="mt-3 mb-1.5 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
              Phần {section.order}: {formatNullableText(section.title)}
            </div>
            {section.items.map((item) => {
              const otherItem = otherSection?.items.find((candidate) => candidate.order === item.order)
              const differs = (item.question?.id ?? item.questionId ?? '') !== (otherItem?.question?.id ?? otherItem?.questionId ?? '')
              return (
                <div
                  className={`mb-1.5 flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 ${differs ? 'bg-amber-50' : ''}`}
                  key={item.id}
                >
                  <span className="text-xs font-semibold text-slate-500">Câu {item.order}</span>
                  <span className="font-mono text-xs font-bold text-slate-900">{item.question?.code ?? '—'}</span>
                </div>
              )
            })}
          </div>
        )
      })}
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

      <div className="grid gap-3">
        {exam.papers?.map((paper) => (
          <button
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
            key={paper.id}
            onClick={() => navigate(`/teacher/exams/${exam.id}/papers/${paper.id}`)}
            type="button"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-indigo-50 text-indigo-600">
              <FilePenLine size={20} />
            </span>
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-900">{paper.code} · Variant {paper.variant}</div>
              <div className="mt-1"><PaperStatusBadge status={paper.status} /></div>
            </div>
          </button>
        ))}
        {exam.papers?.length ? null : (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
            Chưa có mã đề nào.
          </div>
        )}
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
  const [shuffleEnabled, setShuffleEnabled] = useState(true)
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareWithId, setCompareWithId] = useState<string | null>(null)

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
  const otherPapers = (exam.papers ?? []).filter((candidate) => candidate.id !== paper.id)

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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <FilePenLine size={22} />
          </span>
          <div>
            <p className="text-lg font-extrabold text-slate-900">{paper.code}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Variant {paper.variant}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PaperStatusBadge status={paper.status} />
          {otherPapers.length > 0 ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setCompareOpen((current) => !current)}
              type="button"
            >
              <Columns2 size={16} />
              {compareOpen ? 'Đóng so sánh' : 'So sánh mã đề'}
            </button>
          ) : null}
          {paper.status === 'DRAFT' ? (
            <button
              className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-bold text-white ${canManagePaperActions ? 'bg-linear-to-r from-indigo-600 to-cyan-500' : 'bg-slate-300'}`}
              disabled={!canManagePaperActions}
              onClick={() => navigate(`/teacher/exams/${exam.id}/papers/${paper.id}/edit`)}
              type="button"
            >
              Sửa đề thi
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4">
        <span className="flex h-9.5 w-9.5 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600">
          <Shuffle size={18} />
        </span>
        <div className="flex-1">
          <div className="text-sm font-bold text-slate-900">Đảo thứ tự câu hỏi tự động</div>
          <div className="text-xs font-medium text-slate-500">
            Khi giao đề, hệ thống trộn thứ tự câu trong từng phần cho mỗi học sinh để chống nhìn bài. (Tuỳ chọn hiển thị — chưa có ở backend nên chưa được lưu.)
          </div>
        </div>
        <button
          className={`relative h-6.5 w-11.5 rounded-full transition-colors ${shuffleEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
          onClick={() => setShuffleEnabled((current) => !current)}
          type="button"
        >
          <span
            className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-all ${shuffleEnabled ? 'left-5.5' : 'left-0.5'}`}
          />
        </button>
      </div>

      {compareOpen ? (
        <PaperComparePanel
          compareWithId={compareWithId}
          currentPaper={paper}
          otherPapers={otherPapers}
          onSelectCompareWith={setCompareWithId}
        />
      ) : null}

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
                      forExamPaper
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
