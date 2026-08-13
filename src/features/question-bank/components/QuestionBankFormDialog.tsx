import type { FormEvent } from 'react'
import { useState } from 'react'
import { Check, ChevronLeft, X } from 'lucide-react'
import type { SupportedLanguage } from '@/features/languages/types'
import type { QuestionBankDto } from '../types'

export type QuestionBankFormMode = 'create' | 'edit'

export type QuestionBankFormValues = {
  code: string
  description: string
  languageId: string
  name: string
}

type QuestionBankFormDialogProps = {
  errorMessage?: string
  isLanguagesLoading?: boolean
  isSubmitting: boolean
  languages?: SupportedLanguage[]
  mode: QuestionBankFormMode | null
  onClose: () => void
  onSubmit: (mode: QuestionBankFormMode, payload: QuestionBankFormValues) => void
  questionBank: QuestionBankDto | null
  /** Ngân hàng hệ thống phải chọn ngôn ngữ; ngân hàng trường dùng ngôn ngữ mặc định của module. */
  showLanguageField?: boolean
}

function createFormState(bank: QuestionBankDto | null): QuestionBankFormValues {
  return {
    code: bank?.code ?? '',
    description: bank?.description ?? '',
    languageId: bank?.languageId ?? '',
    name: bank?.name ?? bank?.bankName ?? '',
  }
}

function trimFormState(state: QuestionBankFormValues): QuestionBankFormValues {
  return {
    code: state.code.trim(),
    description: state.description.trim(),
    languageId: state.languageId,
    name: state.name.trim(),
  }
}

export function QuestionBankFormDialog({
  errorMessage,
  isLanguagesLoading = false,
  isSubmitting,
  languages = [],
  mode,
  questionBank,
  onClose,
  onSubmit,
  showLanguageField = false,
}: QuestionBankFormDialogProps) {
  const [form, setForm] = useState(() => createFormState(questionBank))
  const [step, setStep] = useState<'confirm' | 'form'>('form')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  if (!mode) {
    return null
  }

  const isCreateMode = mode === 'create'
  // Ngôn ngữ chỉ đặt được lúc tạo: đổi ngôn ngữ của ngân hàng đã có câu hỏi là đổi ý nghĩa của
  // toàn bộ dữ liệu bên trong, nên backend cũng không cho sửa qua API cập nhật.
  const needsLanguage = isCreateMode && showLanguageField
  const selectedLanguage = languages.find((language) => language.id === form.languageId)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = trimFormState(form)

    if (isCreateMode && !values.code) {
      setValidationMessage('Mã ngân hàng không được để trống.')
      return
    }

    if (!values.name) {
      setValidationMessage('Tên ngân hàng không được để trống.')
      return
    }

    if (needsLanguage && !values.languageId) {
      setValidationMessage('Vui lòng chọn ngôn ngữ cho ngân hàng câu hỏi.')
      return
    }

    setValidationMessage(null)
    setStep('confirm')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-blue-950">
              {isCreateMode
                ? 'Tạo ngân hàng câu hỏi'
                : 'Chỉnh sửa ngân hàng câu hỏi'}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {isCreateMode
                ? 'Nhập thông tin cho ngân hàng câu hỏi mới.'
                : 'Chỉ cập nhật được tên và mô tả khi ngân hàng đang ở trạng thái Bản nháp.'}
            </p>
          </div>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          {step === 'form' ? (
            <form className="grid gap-5" onSubmit={handleSubmit}>
              {isCreateMode ? (
                <Field
                  label="Mã ngân hàng"
                  onChange={(value) => {
                    setForm((current) => ({ ...current, code: value }))
                    setValidationMessage(null)
                  }}
                  required
                  value={form.code}
                />
              ) : null}

              <Field
                label="Tên ngân hàng"
                onChange={(value) => {
                  setForm((current) => ({ ...current, name: value }))
                  setValidationMessage(null)
                }}
                required
                value={form.name}
              />

              {needsLanguage ? (
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  <span>
                    Ngôn ngữ
                    <span className="text-red-500"> *</span>
                  </span>
                  <select
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500"
                    disabled={isSubmitting || isLanguagesLoading}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        languageId: event.target.value,
                      }))
                      setValidationMessage(null)
                    }}
                    value={form.languageId}
                  >
                    <option value="">
                      {isLanguagesLoading ? 'Đang tải...' : 'Chọn ngôn ngữ'}
                    </option>
                    {languages.map((language) => (
                      <option key={language.id} value={language.id}>
                        {language.name ?? language.code ?? language.id}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Mô tả
                <textarea
                  className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                    setValidationMessage(null)
                  }}
                  value={form.description}
                />
              </label>

              {validationMessage ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {validationMessage}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  disabled={isSubmitting}
                  onClick={onClose}
                  type="button"
                >
                  Hủy
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-sm font-black text-white transition hover:opacity-90"
                  disabled={isSubmitting}
                  type="submit"
                >
                  <Check className="size-4" />
                  {isCreateMode ? 'Tiếp tục tạo' : 'Tiếp tục cập nhật'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-5">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Vui lòng xác nhận thông tin trước khi lưu.
              </div>

              <dl className="grid gap-3 rounded-lg border border-slate-200 px-4 py-4">
                {isCreateMode ? (
                  <ConfirmItem label="Mã ngân hàng" value={form.code || '-'} />
                ) : null}
                <ConfirmItem label="Tên ngân hàng" value={form.name || '-'} />
                {needsLanguage ? (
                  <ConfirmItem
                    label="Ngôn ngữ"
                    value={selectedLanguage?.name ?? selectedLanguage?.code ?? '-'}
                  />
                ) : null}
                <ConfirmItem label="Mô tả" value={form.description || '-'} />
              </dl>

              {errorMessage ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  disabled={isSubmitting}
                  onClick={() => setStep('form')}
                  type="button"
                >
                  <ChevronLeft className="size-4" />
                  Quay lại
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-sm font-black text-white transition hover:opacity-90"
                  disabled={isSubmitting}
                  onClick={() => onSubmit(mode, trimFormState(form))}
                  type="button"
                >
                  <Check className="size-4" />
                  {isSubmitting
                    ? 'Đang xử lý...'
                    : isCreateMode
                      ? 'Xác nhận tạo'
                      : 'Xác nhận cập nhật'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Field({
  label,
  onChange,
  required = false,
  value,
}: {
  label: string
  onChange: (value: string) => void
  required?: boolean
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      <span>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <input
        className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  )
}

function ConfirmItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 wrap-break-word font-bold text-blue-950">{value}</dd>
    </div>
  )
}
