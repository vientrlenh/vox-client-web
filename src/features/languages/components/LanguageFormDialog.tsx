import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import type {
  CreateSupportedLanguageRequest,
  SupportedLanguage,
  UpdateSupportedLanguageRequest,
} from '../types'

export type LanguageFormMode = 'create' | 'edit'

type LanguageFormDialogProps = {
  errorMessage?: string
  isOpen: boolean
  isSubmitting: boolean
  language: SupportedLanguage | null
  mode: LanguageFormMode
  onClose: () => void
  onCreate: (payload: CreateSupportedLanguageRequest) => void
  onUpdate: (id: string, payload: UpdateSupportedLanguageRequest) => void
}

type FormState = {
  code: string
  description: string
  isActive: boolean
  name: string
}

const emptyForm: FormState = {
  code: '',
  description: '',
  isActive: true,
  name: '',
}

function createFormState(language: SupportedLanguage | null): FormState {
  if (!language) {
    return emptyForm
  }

  return {
    code: language.code ?? '',
    description: language.description ?? '',
    isActive: language.isActive,
    name: language.name ?? '',
  }
}

function trimFormState(state: FormState): FormState {
  return {
    code: state.code.trim(),
    description: state.description.trim(),
    isActive: state.isActive,
    name: state.name.trim(),
  }
}

function validateForm(state: FormState) {
  const values = trimFormState(state)

  if (!values.code) {
    return 'Mã ngôn ngữ không được để trống.'
  }

  if (values.code.length > 10) {
    return 'Mã ngôn ngữ không được vượt quá 10 ký tự.'
  }

  if (!values.name) {
    return 'Tên ngôn ngữ không được để trống.'
  }

  if (values.name.length > 100) {
    return 'Tên ngôn ngữ không được vượt quá 100 ký tự.'
  }

  if (values.description.length > 2048) {
    return 'Mô tả ngôn ngữ không được vượt quá 2048 ký tự.'
  }

  return null
}

export function LanguageFormDialog({
  errorMessage,
  isOpen,
  isSubmitting,
  language,
  mode,
  onClose,
  onCreate,
  onUpdate,
}: LanguageFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => createFormState(language))
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const isEditMode = mode === 'edit'

  useEffect(() => {
    if (isOpen) {
      setForm(createFormState(language))
      setValidationMessage(null)
    }
  }, [isOpen, language])

  if (!isOpen) {
    return null
  }

  function updateField(name: keyof FormState, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
    setValidationMessage(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = validateForm(form)

    if (validationError) {
      setValidationMessage(validationError)
      return
    }

    const values = trimFormState(form)
    const description = values.description || null

    if (isEditMode) {
      if (!language) {
        setValidationMessage('Không tìm thấy ngôn ngữ cần cập nhật.')
        return
      }

      onUpdate(language.id, {
        code: values.code,
        description,
        isActive: values.isActive,
        name: values.name,
      })
      return
    }

    onCreate({
      code: values.code,
      description,
      name: values.name,
    })
  }

  const title = isEditMode ? 'Cập nhật ngôn ngữ' : 'Tạo ngôn ngữ'
  const description = isEditMode
    ? 'Chỉnh sửa thông tin và trạng thái của ngôn ngữ.'
    : 'Thêm một ngôn ngữ mới vào danh sách hệ thống hỗ trợ.'
  const submitLabel = isEditMode ? 'Lưu thay đổi' : 'Tạo ngôn ngữ'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="language-form-title"
        aria-modal="true"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <h2
              className="text-lg font-black text-blue-950"
              id="language-form-title"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {description}
            </p>
          </div>
          <button
            aria-label="Đóng biểu mẫu ngôn ngữ"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-blue-950">
                Mã ngôn ngữ <span className="text-red-500">*</span>
                <input
                  autoComplete="off"
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  disabled={isSubmitting}
                  maxLength={10}
                  onChange={(event) => updateField('code', event.target.value)}
                  placeholder="Ví dụ: EN"
                  required
                  value={form.code}
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-blue-950">
                Tên ngôn ngữ <span className="text-red-500">*</span>
                <input
                  autoComplete="off"
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  disabled={isSubmitting}
                  maxLength={100}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Ví dụ: Tiếng Anh"
                  required
                  value={form.name}
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              Mô tả
              <textarea
                className="min-h-32 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={isSubmitting}
                maxLength={2048}
                onChange={(event) =>
                  updateField('description', event.target.value)
                }
                placeholder="Nhập mô tả ngôn ngữ nếu cần"
                value={form.description}
              />
              <span className="text-xs font-medium text-slate-500">
                {form.description.trim().length}/2048 ký tự
              </span>
            </label>

            {isEditMode ? (
              <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
                <span className="min-w-0">
                  <span className="block text-sm font-black text-blue-950">
                    Đang hoạt động
                  </span>
                  <span className="mt-1 block text-xs font-medium text-slate-500">
                    Ngôn ngữ không hoạt động sẽ được xem như đã lưu trữ.
                  </span>
                </span>
                <input
                  aria-label="Trạng thái đang hoạt động"
                  checked={form.isActive}
                  className="size-5 accent-indigo-600"
                  disabled={isSubmitting}
                  onChange={(event) =>
                    updateField('isActive', event.target.checked)
                  }
                  type="checkbox"
                />
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
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                onClick={onClose}
                type="button"
              >
                Hủy
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                <Check aria-hidden="true" className="size-4" />
                {isSubmitting ? 'Đang lưu...' : submitLabel}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
