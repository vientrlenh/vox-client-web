import type { FormEvent } from 'react'
import { useState } from 'react'
import { Check, ChevronLeft, X } from 'lucide-react'
import type {
  CreateQuestionRequest,
  QuestionDto,
  QuestionType,
  UpdateQuestionRequest,
} from '../types'

export type QuestionFormMode = 'create' | 'edit'

type QuestionFormDialogProps = {
  errorMessage?: string
  isSubmitting: boolean
  mode: QuestionFormMode | null
  question: QuestionDto | null
  topicId?: string
  onClose: () => void
  onSubmit: (
    mode: QuestionFormMode,
    payload: CreateQuestionRequest | UpdateQuestionRequest,
  ) => void
}

type FormState = {
  audioUrl: string
  durationSeconds: string
  questionText: string
  questionType: string
  standardLevelId: string
  isActive: boolean
}

const QUESTION_TYPE_OPTIONS: Array<{ label: string; value: QuestionType }> = [
  { label: 'Đọc to', value: 'READ_ALOUD' },
  { label: 'Trả lời ngắn', value: 'SHORT_ANSWER' },
  { label: 'Trả lời dài', value: 'LONG_ANSWER' },
  { label: 'Ý kiến', value: 'OPINION' },
  { label: 'Mô tả', value: 'DESCRIPTION' },
]

function createFormState(question: QuestionDto | null): FormState {
  return {
    audioUrl: question?.audioUrl ?? '',
    durationSeconds:
      question?.durationSeconds != null ? String(question.durationSeconds) : '',
    questionText: question?.questionText ?? '',
    questionType: question?.questionType ?? 'READ_ALOUD',
    standardLevelId: question?.standardLevelId ?? '',
    isActive: question?.isActive ?? true,
  }
}

function trimFormState(state: FormState): FormState {
  return {
    audioUrl: state.audioUrl.trim(),
    durationSeconds: state.durationSeconds.trim(),
    questionText: state.questionText.trim(),
    questionType: state.questionType.trim(),
    standardLevelId: state.standardLevelId.trim(),
    isActive: state.isActive,
  }
}

function RequiredMark() {
  return <span className="text-red-500">*</span>
}

export function QuestionFormDialog({
  errorMessage,
  isSubmitting,
  mode,
  question,
  topicId,
  onClose,
  onSubmit,
}: QuestionFormDialogProps) {
  if (!mode) {
    return null
  }

  return (
    <QuestionFormDialogContent
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
      key={mode}
      mode={mode}
      question={question}
      topicId={topicId}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  )
}

function QuestionFormDialogContent({
  errorMessage,
  isSubmitting,
  mode,
  question,
  topicId,
  onClose,
  onSubmit,
}: QuestionFormDialogProps & { mode: QuestionFormMode }) {
  const [form, setForm] = useState(() => createFormState(question))
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  )
  const [step, setStep] = useState<'form' | 'confirm'>('form')

  const isCreateMode = mode === 'create'
  const title = isCreateMode ? 'Tạo câu hỏi mới' : 'Chỉnh sửa câu hỏi'
  const description = isCreateMode
    ? 'Nhập thông tin để tạo câu hỏi mới.'
    : 'Cập nhật thông tin câu hỏi.'
  const submitLabel = isCreateMode ? 'Tiếp tục tạo' : 'Tiếp tục cập nhật'
  const confirmLabel = isCreateMode ? 'Xác nhận tạo' : 'Xác nhận cập nhật'

  function handleFieldChange(name: keyof FormState, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
    setValidationMessage(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!topicId) {
      setValidationMessage('Cần chọn chủ đề trước khi tạo câu hỏi.')
      return
    }

    const values = trimFormState(form)

    if (!values.questionText) {
      setValidationMessage('Nội dung câu hỏi không được để trống.')
      return
    }

    if (!values.standardLevelId) {
      setValidationMessage('Mã trình độ không được để trống.')
      return
    }

    if (!values.durationSeconds) {
      setValidationMessage('Thời gian không được để trống.')
      return
    }

    const duration = Number(values.durationSeconds)

    if (!Number.isInteger(duration) || duration < 1) {
      setValidationMessage('Thời gian phải là số nguyên lớn hơn 0.')
      return
    }

    setValidationMessage(null)
    setStep('confirm')
  }

  function handleBackToForm() {
    setValidationMessage(null)
    setStep('form')
  }

  function handleConfirm() {
    const values = trimFormState(form)
    const durationSeconds = Number(values.durationSeconds)

    if (isCreateMode) {
      if (!topicId) {
        return
      }

      onSubmit('create', {
        audioUrl: values.audioUrl || null,
        durationSeconds,
        questionText: values.questionText,
        questionType: values.questionType,
        standardLevelId: values.standardLevelId,
        topicId,
      } satisfies CreateQuestionRequest)
    } else {
      onSubmit('edit', {
        audioUrl: values.audioUrl || null,
        durationSeconds,
        isActive: values.isActive,
        questionText: values.questionText,
        questionType: values.questionType,
        standardLevelId: values.standardLevelId,
        topicId: question?.topicId ?? '',
      } satisfies UpdateQuestionRequest)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="question-form-title"
        aria-modal="true"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <h2
              className="text-lg font-black text-blue-950"
              id="question-form-title"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {description}
            </p>
          </div>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          {step === 'form' ? (
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <label className="block min-w-0" htmlFor="question-text">
                <span className="mb-1.5 block text-xs font-bold text-blue-950">
                  Nội dung câu hỏi <RequiredMark />
                </span>
                <textarea
                  className="min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  disabled={isSubmitting}
                  id="question-text"
                  maxLength={4096}
                  onChange={(event) =>
                    handleFieldChange('questionText', event.target.value)
                  }
                  placeholder="Nhập nội dung câu hỏi"
                  required
                  value={form.questionText}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block min-w-0" htmlFor="question-type">
                  <span className="mb-1.5 block text-xs font-bold text-blue-950">
                    Loại câu hỏi <RequiredMark />
                  </span>
                  <select
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    disabled={isSubmitting}
                    id="question-type"
                    onChange={(event) =>
                      handleFieldChange('questionType', event.target.value)
                    }
                    value={form.questionType}
                  >
                    {QUESTION_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block min-w-0" htmlFor="standard-level-id">
                  <span className="mb-1.5 block text-xs font-bold text-blue-950">
                    Mã trình độ <RequiredMark />
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    disabled={isSubmitting}
                    id="standard-level-id"
                    maxLength={255}
                    onChange={(event) =>
                      handleFieldChange('standardLevelId', event.target.value)
                    }
                    placeholder="Nhập mã trình độ"
                    required
                    type="text"
                    value={form.standardLevelId}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block min-w-0" htmlFor="duration-seconds">
                  <span className="mb-1.5 block text-xs font-bold text-blue-950">
                    Thời lượng (giây) <RequiredMark />
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    disabled={isSubmitting}
                    id="duration-seconds"
                    min={1}
                    onChange={(event) =>
                      handleFieldChange('durationSeconds', event.target.value)
                    }
                    placeholder="VD: 60"
                    required
                    type="number"
                    value={form.durationSeconds}
                  />
                </label>

                <label className="block min-w-0" htmlFor="audio-url">
                  <span className="mb-1.5 block text-xs font-bold text-blue-950">
                    URL âm thanh
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    disabled={isSubmitting}
                    id="audio-url"
                    maxLength={2048}
                    onChange={(event) =>
                      handleFieldChange('audioUrl', event.target.value)
                    }
                    placeholder="https://..."
                    type="url"
                    value={form.audioUrl}
                  />
                </label>
              </div>

              {!isCreateMode ? (
                <label className="inline-flex items-center gap-2">
                  <input
                    checked={form.isActive}
                    className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    disabled={isSubmitting}
                    onChange={(event) =>
                      handleFieldChange('isActive', event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span className="text-xs font-bold text-blue-950">
                    Đang hoạt động
                  </span>
                </label>
              ) : null}

              {validationMessage ? (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                  role="alert"
                >
                  {validationMessage}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  onClick={onClose}
                  type="button"
                >
                  Hủy
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                >
                  <Check aria-hidden="true" className="size-4" />
                  {submitLabel}
                </button>
              </div>
            </form>
          ) : null}

          {step === 'confirm' ? (
            <div className="grid gap-5">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Vui lòng xác nhận lần cuối trước khi thực hiện thao tác này.
              </div>

              <dl className="grid gap-3 rounded-lg border border-slate-200 px-4 py-4">
                <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                  <dt className="font-semibold text-slate-500">Nội dung</dt>
                  <dd className="min-w-0 wrap-break-word font-bold text-blue-950">
                    {form.questionText || '-'}
                  </dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                  <dt className="font-semibold text-slate-500">Loại</dt>
                  <dd className="min-w-0 wrap-break-word font-bold text-blue-950">
                    {QUESTION_TYPE_OPTIONS.find(
                      (o) => o.value === form.questionType,
                    )?.label ?? form.questionType}
                  </dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                  <dt className="font-semibold text-slate-500">Mã trình độ</dt>
                  <dd className="min-w-0 wrap-break-word font-bold text-blue-950">
                    {form.standardLevelId || '-'}
                  </dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                  <dt className="font-semibold text-slate-500">Thời lượng</dt>
                  <dd className="min-w-0 wrap-break-word font-bold text-blue-950">
                    {form.durationSeconds} giây
                  </dd>
                </div>
              </dl>

              {errorMessage ? (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                  role="alert"
                >
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  onClick={handleBackToForm}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  Quay lại
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  onClick={handleConfirm}
                  type="button"
                >
                  <Check aria-hidden="true" className="size-4" />
                  {isSubmitting ? 'Đang xử lý...' : confirmLabel}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
