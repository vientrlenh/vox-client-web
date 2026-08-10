import { Check, CircleHelp, X } from 'lucide-react'

type SelectOption = {
  label: string
  value: string
}

type ConfirmationDialogProps = {
  cancelLabel?: string
  confirmDisabled?: boolean
  confirmLabel?: string
  isOpen: boolean
  message: string
  onCancel: () => void
  onConfirm: () => void
  onReasonChange?: (value: string) => void
  onSelectChange?: (value: string) => void
  reasonLabel?: string
  reasonPlaceholder?: string
  reasonValue?: string
  selectLabel?: string
  selectOptions?: SelectOption[]
  selectPlaceholder?: string
  selectValue?: string
  showReasonField?: boolean
  showSelectField?: boolean
  title?: string
}

export function ConfirmationDialog({
  cancelLabel = 'Không',
  confirmDisabled = false,
  confirmLabel = 'Xác nhận',
  isOpen,
  message,
  onCancel,
  onConfirm,
  onReasonChange,
  onSelectChange,
  reasonLabel = 'Lý do',
  reasonPlaceholder = 'Nhập lý do nếu cần...',
  reasonValue = '',
  selectLabel = '',
  selectOptions = [],
  selectPlaceholder = '',
  selectValue = '',
  showReasonField = false,
  showSelectField = false,
  title = 'Xác nhận thao tác',
}: ConfirmationDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="confirmation-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700">
              <CircleHelp aria-hidden="true" className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-blue-950" id="confirmation-dialog-title">
                {title}
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-600">{message}</p>
            </div>
          </div>
          <button
            aria-label="Đóng hộp thoại"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        {showReasonField ? (
          <div className="px-6 pt-5">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              <span>{reasonLabel}</span>
              <textarea
                className="min-h-28 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                onChange={(event) => onReasonChange?.(event.target.value)}
                placeholder={reasonPlaceholder}
                value={reasonValue}
              />
            </label>
          </div>
        ) : null}

        {showSelectField ? (
          <div className="px-6 pt-5">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              <span>{selectLabel}</span>
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                onChange={(event) => onSelectChange?.(event.target.value)}
                value={selectValue}
              >
                <option value="">{selectPlaceholder}</option>
                {selectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300"
            disabled={confirmDisabled}
            onClick={onConfirm}
            type="button"
          >
            <Check aria-hidden="true" className="size-4" />
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
