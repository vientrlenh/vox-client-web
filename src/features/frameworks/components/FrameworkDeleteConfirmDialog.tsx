import { Trash2 } from 'lucide-react'

type FrameworkDeleteConfirmDialogProps = {
  isSubmitting: boolean
  message: string
  onClose: () => void
  onConfirm: () => void
  title: string
}

export function FrameworkDeleteConfirmDialog({
  isSubmitting,
  message,
  onClose,
  onConfirm,
  title,
}: FrameworkDeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="framework-delete-confirm-title"
        aria-modal="true"
        className="grid w-full max-w-md gap-5 rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
        role="dialog"
      >
        <div>
          <h2
            className="text-xl font-black text-blue-950"
            id="framework-delete-confirm-title"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            {message}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {isSubmitting ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </section>
    </div>
  )
}
