import type { FormEvent } from 'react'
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { UpdateFrameworkVersionRequest } from '../types'

type FrameworkVersionEditFormDialogProps = {
  errorMessage?: string
  initialValues: UpdateFrameworkVersionRequest
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: UpdateFrameworkVersionRequest) => void
}

function toDateInputValue(value?: string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

export function FrameworkVersionEditFormDialog({
  errorMessage,
  initialValues,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: FrameworkVersionEditFormDialogProps) {
  const [code, setCode] = useState(initialValues.code)
  const [name, setName] = useState(initialValues.name)
  const [description, setDescription] = useState(
    initialValues.description ?? '',
  )
  const [effectiveFrom, setEffectiveFrom] = useState(
    toDateInputValue(initialValues.effectiveFrom),
  )
  const [effectiveTo, setEffectiveTo] = useState(
    toDateInputValue(initialValues.effectiveTo),
  )
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'code' | 'effectiveFrom' | 'effectiveTo' | 'name', string>>
  >({})

  if (!isOpen) {
    return null
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors: typeof fieldErrors = {}

    if (!code.trim()) {
      errors.code = 'Mã không được để trống.'
    }

    if (!name.trim()) {
      errors.name = 'Tên không được để trống.'
    }

    if (!effectiveFrom) {
      errors.effectiveFrom = 'Ngày hiệu lực bắt đầu không được để trống.'
    }

    if (
      effectiveTo &&
      effectiveFrom &&
      new Date(effectiveTo) < new Date(effectiveFrom)
    ) {
      errors.effectiveTo = 'Ngày hiệu lực kết thúc phải sau ngày hiệu lực bắt đầu.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    onSubmit({
      code: code.trim(),
      description: description.trim() || null,
      effectiveFrom: new Date(effectiveFrom).toISOString(),
      effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
      name: name.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="framework-version-edit-form-title"
        aria-modal="true"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <h2
            className="text-lg font-black text-blue-950"
            id="framework-version-edit-form-title"
          >
            Sửa phiên bản
          </h2>
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
                autoFocus
                className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.code ? 'border-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
                maxLength={100}
                onChange={(event) => {
                  setCode(event.target.value)
                  setFieldErrors((current) => ({ ...current, code: undefined }))
                }}
                required
                value={code}
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
                className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.name ? 'border-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
                maxLength={200}
                onChange={(event) => {
                  setName(event.target.value)
                  setFieldErrors((current) => ({ ...current, name: undefined }))
                }}
                required
                value={name}
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
                className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-blue-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={isSubmitting}
                maxLength={2048}
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              <span className="whitespace-nowrap">Ngày hiệu lực bắt đầu <span className="text-red-500">*</span></span>
              <input
                className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.effectiveFrom ? 'border-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
                onChange={(event) => {
                  setEffectiveFrom(event.target.value)
                  setFieldErrors((current) => ({
                    ...current,
                    effectiveFrom: undefined,
                  }))
                }}
                required
                type="date"
                value={effectiveFrom}
              />
              {fieldErrors.effectiveFrom ? (
                <p className="text-xs font-semibold text-red-600">
                  {fieldErrors.effectiveFrom}
                </p>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              Ngày hiệu lực kết thúc
              <input
                className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.effectiveTo ? 'border-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
                onChange={(event) => {
                  setEffectiveTo(event.target.value)
                  setFieldErrors((current) => ({
                    ...current,
                    effectiveTo: undefined,
                  }))
                }}
                type="date"
                value={effectiveTo}
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
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
