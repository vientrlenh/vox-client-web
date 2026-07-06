import { Check, CircleHelp, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type ConfirmationDialogProps = {
  cancelLabel?: string
  confirmLabel?: string
  isOpen: boolean
  message: string
  onCancel: () => void
  onConfirm: () => void
  title?: string
}

type ConfirmOptions = {
  cancelLabel?: string
  confirmLabel?: string
  message: string
  title?: string
}

type ConfirmState = ConfirmOptions & {
  isOpen: boolean
}

const DEFAULT_STATE: ConfirmState = {
  cancelLabel: 'No',
  confirmLabel: 'Yes',
  isOpen: false,
  message: '',
  title: 'Xac nhan thao tac',
}

export function ConfirmationDialog({
  cancelLabel = 'No',
  confirmLabel = 'Yes',
  isOpen,
  message,
  onCancel,
  onConfirm,
  title = 'Xac nhan thao tac',
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
              <h2
                className="text-lg font-black text-blue-950"
                id="confirmation-dialog-title"
              >
                {title}
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                {message}
              </p>
            </div>
          </div>
          <button
            aria-label="Dong hop thoai"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700"
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

export function useConfirmationDialog() {
  const resolverRef = useRef<((value: boolean) => void) | null>(null)
  const [state, setState] = useState<ConfirmState>(DEFAULT_STATE)

  useEffect(() => {
    return () => {
      resolverRef.current?.(false)
      resolverRef.current = null
    }
  }, [])

  function closeWith(value: boolean) {
    resolverRef.current?.(value)
    resolverRef.current = null
    setState((current) => ({ ...current, isOpen: false }))
  }

  function confirm(options: ConfirmOptions) {
    setState({
      cancelLabel: options.cancelLabel ?? 'No',
      confirmLabel: options.confirmLabel ?? 'Yes',
      isOpen: true,
      message: options.message,
      title: options.title ?? 'Xac nhan thao tac',
    })

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }

  return {
    confirm,
    dialog: (
      <ConfirmationDialog
        cancelLabel={state.cancelLabel}
        confirmLabel={state.confirmLabel}
        isOpen={state.isOpen}
        message={state.message}
        onCancel={() => closeWith(false)}
        onConfirm={() => closeWith(true)}
        title={state.title}
      />
    ),
  }
}
