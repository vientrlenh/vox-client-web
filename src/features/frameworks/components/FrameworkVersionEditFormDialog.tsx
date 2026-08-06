import type { FormEvent } from 'react'
import { useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import type { UpdateFrameworkVersionRequest } from '../types'

type FrameworkVersionEditFormDialogProps = {
  errorMessage?: string
  initialValues: UpdateFrameworkVersionRequest
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: UpdateFrameworkVersionRequest) => void
}

function toDateTimeInputValue(value?: string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
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
    toDateTimeInputValue(initialValues.effectiveFrom),
  )
  const [effectiveTo, setEffectiveTo] = useState(
    toDateTimeInputValue(initialValues.effectiveTo),
  )
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'code' | 'effectiveFrom' | 'effectiveTo' | 'name', string>>
  >({})
  const [showCancelWarning, setShowCancelWarning] = useState(false)
  const hasChanges =
    code !== initialValues.code ||
    name !== initialValues.name ||
    description !== (initialValues.description ?? '') ||
    effectiveFrom !== toDateTimeInputValue(initialValues.effectiveFrom) ||
    effectiveTo !== toDateTimeInputValue(initialValues.effectiveTo)

  if (!isOpen) {
    return null
  }

  function handleCancel() {
    if (hasChanges) {
      setShowCancelWarning(true)
      return
    }

    onClose()
  }

  function handleDiscardChanges() {
    setShowCancelWarning(false)
    onClose()
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
        <header className="border-b border-slate-200 px-6 py-5">
          <h2
            className="text-lg font-black text-blue-950"
            id="framework-version-edit-form-title"
          >
            Sửa phiên bản
          </h2>
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
              <span className="whitespace-nowrap">Thời điểm hiệu lực bắt đầu <span className="text-red-500">*</span></span>
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
                type="datetime-local"
                value={effectiveFrom}
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
                className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.effectiveTo ? 'border-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
                onChange={(event) => {
                  setEffectiveTo(event.target.value)
                  setFieldErrors((current) => ({
                    ...current,
                    effectiveTo: undefined,
                  }))
                }}
                type="datetime-local"
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
                onClick={handleCancel}
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

      {showCancelWarning ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4">
          <section
            aria-describedby="framework-version-cancel-warning-description"
            aria-labelledby="framework-version-cancel-warning-title"
            aria-modal="true"
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"
            role="alertdialog"
          >
            <div className="flex items-start gap-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h3
                  className="text-lg font-black text-blue-950"
                  id="framework-version-cancel-warning-title"
                >
                  Hủy các thay đổi?
                </h3>
                <p
                  className="mt-2 text-sm font-medium text-slate-600"
                  id="framework-version-cancel-warning-description"
                >
                  Những thay đổi bạn đã thực hiện chưa được lưu và sẽ bị mất.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setShowCancelWarning(false)}
                type="button"
              >
                Tiếp tục chỉnh sửa
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700 focus:ring-4 focus:ring-red-100"
                onClick={handleDiscardChanges}
                type="button"
              >
                Hủy thay đổi
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
