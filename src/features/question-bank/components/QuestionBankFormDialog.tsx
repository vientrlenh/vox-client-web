import type { FormEvent } from 'react'
import { useState } from 'react'
import { Check, ChevronLeft, X } from 'lucide-react'
import type {
  CreateQuestionBankRequest,
  QuestionBankDto,
  UpdateQuestionBankRequest,
} from '../types'

export type QuestionBankFormMode = 'create' | 'edit'

type QuestionBankFormDialogProps = {
  errorMessage?: string
  isSubmitting: boolean
  mode: QuestionBankFormMode | null
  questionBank: QuestionBankDto | null
  onClose: () => void
  onSubmit: (
    mode: QuestionBankFormMode,
    payload: CreateQuestionBankRequest | UpdateQuestionBankRequest,
  ) => void
}

type FormState = {
  bankName: string
  description: string
  isActive: boolean
}

function createFormState(bank: QuestionBankDto | null): FormState {
  return {
    bankName: bank?.bankName ?? '',
    description: bank?.description ?? '',
    isActive: bank?.isActive ?? true,
  }
}

function trimFormState(state: FormState): FormState {
  return {
    bankName: state.bankName.trim(),
    description: state.description.trim(),
    isActive: state.isActive,
  }
}

function RequiredMark() {
  return <span className="text-red-500">*</span>
}

export function QuestionBankFormDialog({
  errorMessage,
  isSubmitting,
  mode,
  questionBank,
  onClose,
  onSubmit,
}: QuestionBankFormDialogProps) {
  if (!mode) {
    return null
  }

  return (
    <QuestionBankFormDialogContent
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
      key={mode}
      mode={mode}
      questionBank={questionBank}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  )
}

function QuestionBankFormDialogContent({
  errorMessage,
  isSubmitting,
  mode,
  questionBank,
  onClose,
  onSubmit,
}: QuestionBankFormDialogProps & { mode: QuestionBankFormMode }) {
  const [form, setForm] = useState(() => createFormState(questionBank))
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  )
  const [step, setStep] = useState<'form' | 'confirm'>('form')

  const isCreateMode = mode === 'create'
  const title = isCreateMode
    ? 'Tạo ngân hàng câu hỏi'
    : 'Chỉnh sửa ngân hàng câu hỏi'
  const description = isCreateMode
    ? 'Nhập thông tin để tạo ngân hàng câu hỏi mới.'
    : 'Cập nhật thông tin ngân hàng câu hỏi.'
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

    const values = trimFormState(form)

    if (!values.bankName) {
      setValidationMessage('Tên ngân hàng không được để trống.')
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
        bankName: values.bankName,
        description: values.description || null,
      } satisfies CreateQuestionBankRequest)
    } else {
      onSubmit('edit', {
        bankName: values.bankName,
        description: values.description || null,
        isActive: values.isActive,
      } satisfies UpdateQuestionBankRequest)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="question-bank-form-title"
        aria-modal="true"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <h2
              className="text-lg font-black text-blue-950"
              id="question-bank-form-title"
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
              <label className="block min-w-0" htmlFor="question-bank-name">
                <span className="mb-1.5 block text-xs font-bold text-blue-950">
                  Tên ngân hàng <RequiredMark />
                </span>
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  disabled={isSubmitting}
                  id="question-bank-name"
                  maxLength={255}
                  onChange={(event) =>
                    handleFieldChange('bankName', event.target.value)
                  }
                  placeholder="Nhập tên ngân hàng câu hỏi"
                  required
                  type="text"
                  value={form.bankName}
                />
              </label>

              <label className="block min-w-0" htmlFor="question-bank-description">
                <span className="mb-1.5 block text-xs font-bold text-blue-950">
                  Mô tả
                </span>
                <textarea
                  className="min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  disabled={isSubmitting}
                  id="question-bank-description"
                  maxLength={2048}
                  onChange={(event) =>
                    handleFieldChange('description', event.target.value)
                  }
                  placeholder="Nhập mô tả ngân hàng câu hỏi nếu cần"
                  value={form.description}
                />
              </label>

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
                  <dt className="font-semibold text-slate-500">Tên ngân hàng</dt>
                  <dd className="min-w-0 wrap-break-word font-bold text-blue-950">
                    {form.bankName || '-'}
                  </dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                  <dt className="font-semibold text-slate-500">Mô tả</dt>
                  <dd className="min-w-0 wrap-break-word font-bold text-blue-950">
                    {form.description || '-'}
                  </dd>
                </div>
                {!isCreateMode ? (
                  <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                    <dt className="font-semibold text-slate-500">Trạng thái</dt>
                    <dd className="min-w-0 wrap-break-word font-bold text-blue-950">
                      {form.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                    </dd>
                  </div>
                ) : null}
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
