import type { FormEvent } from 'react'
import { useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
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
  const [initialPositiveSignals] = useState(initialValues?.positiveSignals ?? [])
  const [initialNegativeSignals] = useState(initialValues?.negativeSignals ?? [])
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
  const [positiveListContainer, setPositiveListContainer] =
    useState<HTMLDivElement | null>(null)
  const [negativeListContainer, setNegativeListContainer] =
    useState<HTMLDivElement | null>(null)
  const [hasSignalDraft, setHasSignalDraft] = useState(false)
  const [showUnsavedSignalWarning, setShowUnsavedSignalWarning] = useState(false)
  const [showDiscardSignalsWarning, setShowDiscardSignalsWarning] = useState(false)

  if (!isOpen) {
    return null
  }

  const hasAddedSignalChanges =
    JSON.stringify(positiveSignals) !== JSON.stringify(initialPositiveSignals) ||
    JSON.stringify(negativeSignals) !== JSON.stringify(initialNegativeSignals)
  const hasChanges =
    hasSignalDraft ||
    hasAddedSignalChanges ||
    descriptor !== (initialValues?.descriptor ?? '') ||
    (!isEditMode && resultBandCode !== '')

  function submitForm() {
    onSubmit({
      descriptor: descriptor.trim() || null,
      negativeSignals,
      positiveSignals,
      resultBandCode,
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isEditMode && !resultBandCode) {
      setFieldErrors({ resultBandCode: 'Vui lòng chọn thang kết quả.' })
      return
    }

    if (hasSignalDraft) {
      setShowUnsavedSignalWarning(true)
      return
    }

    submitForm()
  }

  function handleDiscardDraftAndSubmit() {
    setShowUnsavedSignalWarning(false)
    submitForm()
  }

  function handleCancelClick() {
    if (hasChanges) {
      setShowDiscardSignalsWarning(true)
      return
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center gap-4 overflow-y-auto bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="framework-criterion-band-form-title"
        aria-modal="true"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <header className="border-b border-slate-200 px-6 py-5">
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
              Dấu hiệu
              <FrameworkSignalListEditor
                disabled={isSubmitting}
                negativeListContainer={negativeListContainer}
                negativeSignals={negativeSignals}
                onDraftStateChange={setHasSignalDraft}
                onNegativeChange={setNegativeSignals}
                onPositiveChange={setPositiveSignals}
                positiveListContainer={positiveListContainer}
                positiveSignals={positiveSignals}
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
                onClick={handleCancelClick}
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

      <aside className="flex max-h-[calc(100vh-2rem)] w-full max-w-xs flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="border-b border-slate-200 px-4 py-4">
          <h3 className="text-sm font-black text-blue-950">Dấu hiệu đã thêm</h3>
        </header>
        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-4 py-4">
          <div className="grid gap-2 text-sm font-bold text-blue-950">
            Dấu hiệu tích cực
            <div
              className="grid max-h-72 gap-1.5 overflow-y-auto pr-1"
              ref={setPositiveListContainer}
            />
          </div>
          <div className="grid gap-2 text-sm font-bold text-blue-950">
            Dấu hiệu tiêu cực
            <div
              className="grid max-h-72 gap-1.5 overflow-y-auto pr-1"
              ref={setNegativeListContainer}
            />
          </div>
        </div>
      </aside>

      {showUnsavedSignalWarning ? (
        <div className="fixed inset-0 z-60 grid place-items-center bg-slate-950/45 px-4 py-6">
          <section
            aria-labelledby="unsaved-signal-warning-title"
            aria-modal="true"
            className="grid w-full max-w-sm gap-5 rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
            role="dialog"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <AlertTriangle aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-blue-950" id="unsaved-signal-warning-title">
                  Dấu hiệu chưa được thêm
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  Bạn đang nhập một dấu hiệu nhưng chưa nhấn "Thêm". Nếu tiếp tục lưu, dấu hiệu này sẽ bị mất.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setShowUnsavedSignalWarning(false)}
                type="button"
              >
                Quay lại nhập
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-700"
                onClick={handleDiscardDraftAndSubmit}
                type="button"
              >
                Bỏ qua và lưu
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {showDiscardSignalsWarning ? (
        <div className="fixed inset-0 z-60 grid place-items-center bg-slate-950/45 px-4 py-6">
          <section
            aria-labelledby="discard-signals-warning-title"
            aria-modal="true"
            className="grid w-full max-w-sm gap-5 rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
            role="dialog"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <AlertTriangle aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-blue-950" id="discard-signals-warning-title">
                  Thay đổi chưa được lưu
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  Những thay đổi bạn đã thực hiện chưa được lưu và sẽ bị mất.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setShowDiscardSignalsWarning(false)}
                type="button"
              >
                Tiếp tục chỉnh sửa
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700"
                onClick={() => {
                  setShowDiscardSignalsWarning(false)
                  onClose()
                }}
                type="button"
              >
                Hủy và bỏ thay đổi
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
