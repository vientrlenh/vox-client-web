import type { FormEvent } from 'react'
import { useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import type { FrameworkCriterionInput } from '../types'

const CRITERION_CODE_OPTIONS = [
  'Pronunciation',
  'Fluency',
  'Grammar',
  'Vocabulary',
  'Coherence',
] as const

type FrameworkCriterionFormDialogProps = {
  errorMessage?: string
  initialValues?: FrameworkCriterionInput
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: FrameworkCriterionInput) => void
}

export function FrameworkCriterionFormDialog({
  errorMessage,
  initialValues,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: FrameworkCriterionFormDialogProps) {
  const isEditMode = Boolean(initialValues)
  const initialCode =
    CRITERION_CODE_OPTIONS.find(
      (option) => option.toUpperCase() === initialValues?.code?.toUpperCase(),
    ) ?? CRITERION_CODE_OPTIONS[0]
  const [code, setCode] = useState<(typeof CRITERION_CODE_OPTIONS)[number]>(
    initialCode,
  )
  const [name, setName] = useState(initialValues?.name ?? '')
  const [description, setDescription] = useState(
    initialValues?.description ?? '',
  )
  const [order, setOrder] = useState(initialValues?.order ?? 1)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'code' | 'name', string>>
  >({})
  const [showCancelWarning, setShowCancelWarning] = useState(false)
  const hasChanges =
    code !== initialCode ||
    name !== (initialValues?.name ?? '') ||
    description !== (initialValues?.description ?? '') ||
    order !== (initialValues?.order ?? 1)

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
      errors.name = 'Tên tiêu chí không được để trống.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    onSubmit({
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      name: name.trim(),
      order,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="framework-criterion-form-title"
        aria-modal="true"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <header className="border-b border-slate-200 px-6 py-5">
          <h2
            className="text-lg font-black text-blue-950"
            id="framework-criterion-form-title"
          >
            {isEditMode ? 'Sửa tiêu chí' : 'Thêm tiêu chí'}
          </h2>
        </header>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-bold text-blue-950">
              <span className="whitespace-nowrap">Mã <span className="text-red-500">*</span></span>
              <select
                autoFocus
                className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.code ? 'border-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
                onChange={(event) => {
                  setCode(
                    event.target.value as (typeof CRITERION_CODE_OPTIONS)[number],
                  )
                  setFieldErrors((current) => ({ ...current, code: undefined }))
                }}
                required
                value={code}
              >
                {CRITERION_CODE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {fieldErrors.code ? (
                <p className="text-xs font-semibold text-red-600">
                  {fieldErrors.code}
                </p>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              <span className="whitespace-nowrap">Tên tiêu chí <span className="text-red-500">*</span></span>
              <input
                className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.name ? 'border-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
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
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              <span className="whitespace-nowrap">Thứ tự <span className="text-red-500">*</span></span>
              <input
                className="h-11 w-32 rounded-lg border border-slate-200 px-3 text-sm font-medium text-blue-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={isSubmitting}
                min={1}
                onChange={(event) =>
                  setOrder(Number.parseInt(event.target.value, 10) || 1)
                }
                required
                type="number"
                value={order}
              />
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
                {isEditMode
                  ? isSubmitting
                    ? 'Đang lưu...'
                    : 'Lưu thay đổi'
                  : isSubmitting
                    ? 'Đang thêm...'
                    : 'Thêm tiêu chí'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {showCancelWarning ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4">
          <section
            aria-describedby="framework-criterion-cancel-warning-description"
            aria-labelledby="framework-criterion-cancel-warning-title"
            aria-modal="true"
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"
            role="alertdialog"
          >
            <div className="flex items-start gap-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h3 className="text-lg font-black text-blue-950" id="framework-criterion-cancel-warning-title">
                  Hủy các thay đổi?
                </h3>
                <p className="mt-2 text-sm font-medium text-slate-600" id="framework-criterion-cancel-warning-description">
                  Những thay đổi bạn đã thực hiện chưa được lưu và sẽ bị mất.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50" onClick={() => setShowCancelWarning(false)} type="button">
                Tiếp tục chỉnh sửa
              </button>
              <button className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700 focus:ring-4 focus:ring-red-100" onClick={handleDiscardChanges} type="button">
                Hủy thay đổi
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
