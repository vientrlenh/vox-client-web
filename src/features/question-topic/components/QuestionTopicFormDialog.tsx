import type { FormEvent } from 'react'
import { useState } from 'react'
import { Check, ChevronLeft, X } from 'lucide-react'
import type {
  CreateQuestionTopicRequest,
  QuestionTopicDto,
  UpdateQuestionTopicRequest,
} from '../types'

export type QuestionTopicFormMode = 'create' | 'edit'

type QuestionTopicFormDialogProps = {
  bankId: string
  errorMessage?: string
  isSubmitting: boolean
  mode: QuestionTopicFormMode | null
  questionTopic: QuestionTopicDto | null
  onClose: () => void
  onSubmit: (
    mode: QuestionTopicFormMode,
    payload: CreateQuestionTopicRequest | UpdateQuestionTopicRequest,
  ) => void
}

type FormState = {
  description: string
  topicName: string
}

function createFormState(topic: QuestionTopicDto | null): FormState {
  return {
    description: topic?.description ?? '',
    topicName: topic?.topicName ?? '',
  }
}

function trimFormState(state: FormState): FormState {
  return {
    description: state.description.trim(),
    topicName: state.topicName.trim(),
  }
}

function RequiredMark() {
  return <span className="text-red-500">*</span>
}

export function QuestionTopicFormDialog({
  bankId,
  errorMessage,
  isSubmitting,
  mode,
  questionTopic,
  onClose,
  onSubmit,
}: QuestionTopicFormDialogProps) {
  if (!mode) {
    return null
  }

  return (
    <QuestionTopicFormDialogContent
      bankId={bankId}
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
      key={mode}
      mode={mode}
      questionTopic={questionTopic}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  )
}

function QuestionTopicFormDialogContent({
  bankId,
  errorMessage,
  isSubmitting,
  mode,
  questionTopic,
  onClose,
  onSubmit,
}: QuestionTopicFormDialogProps & { mode: QuestionTopicFormMode }) {
  const [form, setForm] = useState(() => createFormState(questionTopic))
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  )
  const [step, setStep] = useState<'form' | 'confirm'>('form')

  const isCreateMode = mode === 'create'
  const title = isCreateMode ? 'Tạo chủ đề mới' : 'Chỉnh sửa chủ đề'
  const description = isCreateMode
    ? 'Nhập thông tin để tạo chủ đề câu hỏi mới.'
    : 'Cập nhật thông tin chủ đề câu hỏi.'
  const submitLabel = isCreateMode ? 'Tiếp tục tạo' : 'Tiếp tục cập nhật'
  const confirmLabel = isCreateMode ? 'Xác nhận tạo' : 'Xác nhận cập nhật'

  function handleFieldChange(name: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
    setValidationMessage(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const values = trimFormState(form)

    if (!values.topicName) {
      setValidationMessage('Tên chủ đề không được để trống.')
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

    if (isCreateMode) {
      onSubmit('create', {
        bankId,
        description: values.description || null,
        topicName: values.topicName,
      } satisfies CreateQuestionTopicRequest)
    } else {
      onSubmit('edit', {
        description: values.description || null,
        topicName: values.topicName,
      } satisfies UpdateQuestionTopicRequest)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="question-topic-form-title"
        aria-modal="true"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <h2
              className="text-lg font-black text-blue-950"
              id="question-topic-form-title"
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
              <label className="block min-w-0" htmlFor="question-topic-name">
                <span className="mb-1.5 block text-xs font-bold text-blue-950">
                  Tên chủ đề <RequiredMark />
                </span>
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  disabled={isSubmitting}
                  id="question-topic-name"
                  maxLength={255}
                  onChange={(event) =>
                    handleFieldChange('topicName', event.target.value)
                  }
                  placeholder="Nhập tên chủ đề"
                  required
                  type="text"
                  value={form.topicName}
                />
              </label>

              <label
                className="block min-w-0"
                htmlFor="question-topic-description"
              >
                <span className="mb-1.5 block text-xs font-bold text-blue-950">
                  Mô tả
                </span>
                <textarea
                  className="min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  disabled={isSubmitting}
                  id="question-topic-description"
                  maxLength={2048}
                  onChange={(event) =>
                    handleFieldChange('description', event.target.value)
                  }
                  placeholder="Nhập mô tả chủ đề nếu cần"
                  value={form.description}
                />
              </label>

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
                  <dt className="font-semibold text-slate-500">Tên chủ đề</dt>
                  <dd className="min-w-0 wrap-break-word font-bold text-blue-950">
                    {form.topicName || '-'}
                  </dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                  <dt className="font-semibold text-slate-500">Mô tả</dt>
                  <dd className="min-w-0 wrap-break-word font-bold text-blue-950">
                    {form.description || '-'}
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
