import type { FormEvent } from 'react'
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { CreateFrameworkVersionRequest } from '../types'

type FrameworkVersionFormDialogProps = {
  errorMessage?: string
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onCreate: (payload: CreateFrameworkVersionRequest) => void
}

type FormState = {
  code: string
  description: string
  effectiveFrom: string
  effectiveTo: string
  name: string
  version: string
}

const emptyForm: FormState = {
  code: '',
  description: '',
  effectiveFrom: '',
  effectiveTo: '',
  name: '',
  version: '1',
}

function trimFormState(state: FormState): FormState {
  return {
    code: state.code.trim(),
    description: state.description.trim(),
    effectiveFrom: state.effectiveFrom.trim(),
    effectiveTo: state.effectiveTo.trim(),
    name: state.name.trim(),
    version: state.version.trim(),
  }
}

type FieldErrors = Partial<Record<keyof FormState, string>>

function validateForm(state: FormState): FieldErrors {
  const values = trimFormState(state)
  const errors: FieldErrors = {}

  if (!values.code) {
    errors.code = 'Mã phiên bản không được để trống.'
  } else if (values.code.length > 100) {
    errors.code = 'Mã phiên bản không được vượt quá 100 ký tự.'
  }

  if (!values.name) {
    errors.name = 'Tên phiên bản không được để trống.'
  } else if (values.name.length > 200) {
    errors.name = 'Tên phiên bản không được vượt quá 200 ký tự.'
  }

  if (values.description.length > 2048) {
    errors.description = 'Mô tả không được vượt quá 2048 ký tự.'
  }

  const version = Number.parseInt(values.version, 10)

  if (!Number.isInteger(version) || version < 1) {
    errors.version = 'Phiên bản phải là số nguyên lớn hơn hoặc bằng 1.'
  }

  if (!values.effectiveFrom) {
    errors.effectiveFrom = 'Ngày hiệu lực bắt đầu không được để trống.'
  }

  if (
    values.effectiveTo &&
    values.effectiveFrom &&
    new Date(values.effectiveTo) < new Date(values.effectiveFrom)
  ) {
    errors.effectiveTo = 'Ngày hiệu lực kết thúc phải sau ngày hiệu lực bắt đầu.'
  }

  return errors
}

export function FrameworkVersionFormDialog({
  errorMessage,
  isOpen,
  isSubmitting,
  onClose,
  onCreate,
}: FrameworkVersionFormDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  if (!isOpen) {
    return null
  }

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateForm(form)

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    const values = trimFormState(form)

    onCreate({
      code: values.code.trim().toUpperCase(),
      description: values.description || null,
      effectiveFrom: new Date(values.effectiveFrom).toISOString(),
      effectiveTo: values.effectiveTo
        ? new Date(values.effectiveTo).toISOString()
        : null,
      name: values.name,
      version: Number.parseInt(values.version, 10),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="framework-version-form-title"
        aria-modal="true"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <h2
              className="text-lg font-black text-blue-950"
              id="framework-version-form-title"
            >
              Tạo phiên bản
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Thêm một phiên bản mới (bản nháp) cho framework.
            </p>
          </div>
          <button
            aria-label="Đóng biểu mẫu phiên bản"
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
            <label className="grid gap-2 text-sm font-bold text-blue-950">
              <span className="whitespace-nowrap">Mã phiên bản <span className="text-red-500">*</span></span>
              <input
                autoComplete="off"
                autoFocus
                className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.code ? 'border-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
                maxLength={100}
                onChange={(event) => updateField('code', event.target.value)}
                placeholder="Ví dụ: V1"
                required
                value={form.code}
              />
              {fieldErrors.code ? (
                <p className="text-xs font-semibold text-red-600">
                  {fieldErrors.code}
                </p>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              <span className="whitespace-nowrap">Tên phiên bản <span className="text-red-500">*</span></span>
              <input
                autoComplete="off"
                className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.name ? 'border-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
                maxLength={200}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Ví dụ: v1.0"
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
                placeholder="Nhập mô tả phiên bản nếu cần"
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

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              <span className="whitespace-nowrap">Số phiên bản <span className="text-red-500">*</span></span>
              <input
                className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.version ? 'border-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
                min={1}
                onChange={(event) => updateField('version', event.target.value)}
                required
                step={1}
                type="number"
                value={form.version}
              />
              {fieldErrors.version ? (
                <p className="text-xs font-semibold text-red-600">
                  {fieldErrors.version}
                </p>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              <span className="whitespace-nowrap">Thời điểm hiệu lực bắt đầu <span className="text-red-500">*</span></span>
              <input
                className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.effectiveFrom ? 'border-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateField('effectiveFrom', event.target.value)
                }
                required
                type="datetime-local"
                value={form.effectiveFrom}
              />
              {fieldErrors.effectiveFrom ? (
                <p className="text-xs font-semibold text-red-600">
                  {fieldErrors.effectiveFrom}
                </p>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              Thời điểm hiệu lực kết thúc
              <input
                className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.effectiveTo ? 'border-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateField('effectiveTo', event.target.value)
                }
                type="datetime-local"
                value={form.effectiveTo}
              />
              {fieldErrors.effectiveTo ? (
                <p className="text-xs font-semibold text-red-600">
                  {fieldErrors.effectiveTo}
                </p>
              ) : null}
            </label>

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
                {isSubmitting ? 'Đang tạo...' : 'Tạo phiên bản'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
