import type { FormEvent } from 'react'
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type {
  CreateFrameworkRequest,
  Framework,
  UpdateFrameworkRequest,
} from '../types'

export type FrameworkFormMode = 'create' | 'edit'

type FrameworkFormDialogProps = {
  errorMessage?: string
  framework: Framework | null
  isOpen: boolean
  isSubmitting: boolean
  mode: FrameworkFormMode
  onClose: () => void
  onCreate: (payload: CreateFrameworkRequest, isActive: boolean) => void
  onUpdate: (id: string, payload: UpdateFrameworkRequest) => void
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
  isActive: false,
  name: '',
}

function createFormState(framework: Framework | null): FormState {
  if (!framework) {
    return emptyForm
  }

  return {
    code: '',
    description: framework.description ?? '',
    isActive: framework.isActive,
    name: framework.name,
  }
}

function trimFormState(state: FormState): FormState {
  return {
    code: state.code.trim().toUpperCase(),
    description: state.description.trim(),
    isActive: state.isActive,
    name: state.name.trim(),
  }
}

type FieldErrors = Partial<Record<'code' | 'description' | 'name', string>>

function validateForm(state: FormState, isEditMode: boolean): FieldErrors {
  const values = trimFormState(state)
  const errors: FieldErrors = {}

  if (!isEditMode) {
    if (!values.code) {
      errors.code = 'Mã khung đánh giá năng lực không được để trống.'
    } else if (values.code.length > 100) {
      errors.code = 'Mã khung đánh giá năng lực không được vượt quá 100 ký tự.'
    } else if (!/^[A-Z0-9_-]+$/.test(values.code)) {
      errors.code =
        'Mã khung đánh giá năng lực chỉ được chứa chữ hoa, số, gạch dưới và gạch ngang.'
    }
  }

  if (!values.name) {
    errors.name = 'Tên khung đánh giá năng lực không được để trống.'
  } else if (values.name.length > 200) {
    errors.name = 'Tên khung đánh giá năng lực không được vượt quá 200 ký tự.'
  }

  if (values.description.length > 2048) {
    errors.description = 'Mô tả không được vượt quá 2048 ký tự.'
  }

  return errors
}

export function FrameworkFormDialog({
  errorMessage,
  framework,
  isOpen,
  isSubmitting,
  mode,
  onClose,
  onCreate,
  onUpdate,
}: FrameworkFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => createFormState(framework))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const isEditMode = mode === 'edit'

  if (!isOpen) {
    return null
  }

  function updateField(name: keyof FormState, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateForm(form, isEditMode)

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    const values = trimFormState(form)
    const description = values.description || null

    if (isEditMode) {
      if (!framework) {
        return
      }

      onUpdate(framework.id, {
        description,
        name: values.name,
      })
      return
    }

    onCreate(
      { code: values.code, description, name: values.name },
      values.isActive,
    )
  }

  const title = isEditMode ? 'Cập nhật khung đánh giá năng lực' : 'Tạo khung đánh giá năng lực'
  const description = isEditMode
    ? 'Chỉnh sửa thông tin khung đánh giá năng lực.'
    : 'Thêm một khung đánh giá năng lực đánh giá mới vào hệ thống.'
  const submitLabel = isEditMode ? 'Lưu thay đổi' : 'Tạo khung đánh giá năng lực'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="framework-form-title"
        aria-modal="true"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <h2
              className="text-lg font-black text-blue-950"
              id="framework-form-title"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {description}
            </p>
          </div>
          <button
            aria-label="Đóng biểu mẫu khung đánh giá năng lực"
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
            {!isEditMode ? (
              <label className="grid gap-2 text-sm font-bold text-blue-950">
                <span className="whitespace-nowrap">Mã khung đánh giá năng lực <span className="text-red-500">*</span></span>
                <input
                  autoComplete="off"
                  className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.code ? 'border-red-500' : 'border-slate-200'}`}
                  disabled={isSubmitting}
                  maxLength={100}
                  onChange={(event) =>
                    updateField('code', event.target.value.toUpperCase())
                  }
                  placeholder="Ví dụ: THPT_2024"
                  required
                  value={form.code}
                />
                {fieldErrors.code ? (
                  <p className="text-xs font-semibold text-red-600">
                    {fieldErrors.code}
                  </p>
                ) : null}
              </label>
            ) : null}

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              <span className="whitespace-nowrap">Tên khung đánh giá năng lực <span className="text-red-500">*</span></span>
              <input
                autoComplete="off"
                className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.name ? 'border-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
                maxLength={200}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Ví dụ: Khung đánh giá năng lực KNLNNVN"
                required
                value={form.name}
              />
              {fieldErrors.name ? (
                <p className="text-xs font-semibold text-red-600">
                  {fieldErrors.name}
                </p>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              Mô tả
              <textarea
                className={`min-h-32 rounded-lg border px-3 py-2 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.description ? 'border-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
                maxLength={2048}
                onChange={(event) =>
                  updateField('description', event.target.value)
                }
                placeholder="Nhập mô tả khung đánh giá năng lực nếu cần"
                value={form.description}
              />
              <span className="text-xs font-medium text-slate-500">
                {form.description.trim().length}/2048 ký tự
              </span>
              {fieldErrors.description ? (
                <p className="text-xs font-semibold text-red-600">
                  {fieldErrors.description}
                </p>
              ) : null}
            </label>

            {!isEditMode ? (
              <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
                <span className="min-w-0">
                  <span className="block text-sm font-black text-blue-950">
                    Đang hoạt động
                  </span>
                  <span className="mt-1 block text-xs font-medium text-slate-500">
                    Khung đánh giá năng lực không hoạt động sẽ không xuất hiện trong đánh giá.
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
