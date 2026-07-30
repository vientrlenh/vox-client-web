import type { FormEvent } from 'react'
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type {
  FrameworkCriterionBandInput,
  FrameworkResultBand,
  UpdateFrameworkCriterionBandRequest,
} from '../types'
import { FrameworkSignalListEditor } from './FrameworkSignalListEditor'

type FrameworkCriterionBandFormDialogProps = {
  availableResultBands: FrameworkResultBand[]
  criterionCode: string
  errorMessage?: string
  initialValues?: UpdateFrameworkCriterionBandRequest
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: FrameworkCriterionBandInput) => void
  resultBandLabel?: string
}

export function FrameworkCriterionBandFormDialog({
  availableResultBands,
  criterionCode,
  errorMessage,
  initialValues,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
  resultBandLabel,
}: FrameworkCriterionBandFormDialogProps) {
  const isEditMode = Boolean(initialValues)
  const [resultBandCode, setResultBandCode] = useState('')
  const [descriptor, setDescriptor] = useState(initialValues?.descriptor ?? '')
  const [positiveSignals, setPositiveSignals] = useState<
    FrameworkCriterionBandInput['positiveSignals']
  >(initialValues?.positiveSignals ?? [])
  const [negativeSignals, setNegativeSignals] = useState<
    FrameworkCriterionBandInput['negativeSignals']
  >(initialValues?.negativeSignals ?? [])
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'resultBandCode', string>>
  >({})

  if (!isOpen) {
    return null
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isEditMode && !resultBandCode) {
      setFieldErrors({ resultBandCode: 'Vui lòng chọn thang kết quả.' })
      return
    }

    onSubmit({
      descriptor: descriptor.trim() || null,
      negativeSignals,
      positiveSignals,
      resultBandCode,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="framework-criterion-band-form-title"
        aria-modal="true"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <h2
              className="text-lg font-black text-blue-950"
              id="framework-criterion-band-form-title"
            >
              {isEditMode ? 'Sửa mức đánh giá' : 'Thêm mức đánh giá'}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {isEditMode ? 'Cập nhật' : 'Thêm'} mức đánh giá cho tiêu chí{' '}
              {criterionCode}.
            </p>
          </div>
          <button
            aria-label="Đóng biểu mẫu mức đánh giá"
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
            {isEditMode ? (
              <div className="grid gap-2 text-sm font-bold text-blue-950">
                Thang kết quả
                <div className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-blue-950 leading-11">
                  {resultBandLabel}
                </div>
              </div>
            ) : (
              <label className="grid gap-2 text-sm font-bold text-blue-950">
                <span className="whitespace-nowrap">Thang kết quả <span className="text-red-500">*</span></span>
                <select
                  autoFocus
                  className={`h-11 rounded-lg border px-3 text-sm font-medium text-blue-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${fieldErrors.resultBandCode ? 'border-red-500' : 'border-slate-200'}`}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setResultBandCode(event.target.value)
                    setFieldErrors({})
                  }}
                  required
                  value={resultBandCode}
                >
                  <option value="">Chọn thang kết quả...</option>
                  {availableResultBands.map((band) => (
                    <option key={band.id} value={band.code}>
                      {band.label || band.code}
                    </option>
                  ))}
                </select>
                {fieldErrors.resultBandCode ? (
                  <p className="text-xs font-semibold text-red-600">
                    {fieldErrors.resultBandCode}
                  </p>
                ) : null}
              </label>
            )}

            <label className="grid gap-2 text-sm font-bold text-blue-950">
              Mô tả mức độ
              <textarea
                className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={isSubmitting}
                onChange={(event) => setDescriptor(event.target.value)}
                value={descriptor}
              />
            </label>

            <div className="grid gap-2 text-sm font-bold text-blue-950">
              Dấu hiệu tích cực
              <FrameworkSignalListEditor
                disabled={isSubmitting}
                onChange={setPositiveSignals}
                signals={positiveSignals}
              />
            </div>

            <div className="grid gap-2 text-sm font-bold text-blue-950">
              Dấu hiệu tiêu cực
              <FrameworkSignalListEditor
                disabled={isSubmitting}
                onChange={setNegativeSignals}
                signals={negativeSignals}
              />
            </div>

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
                {isEditMode
                  ? isSubmitting
                    ? 'Đang lưu...'
                    : 'Lưu thay đổi'
                  : isSubmitting
                    ? 'Đang thêm...'
                    : 'Thêm mức đánh giá'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
