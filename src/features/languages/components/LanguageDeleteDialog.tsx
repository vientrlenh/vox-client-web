import { Trash2 } from 'lucide-react'
import type { SupportedLanguage } from '../types'
import { formatNullableText } from '../types'

type LanguageDeleteDialogProps = {
  errorMessage?: string
  isSubmitting: boolean
  language: SupportedLanguage | null
  onClose: () => void
  onConfirm: () => void
}

export function LanguageDeleteDialog({
  errorMessage,
  isSubmitting,
  language,
  onClose,
  onConfirm,
}: LanguageDeleteDialogProps) {
  if (!language) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="language-delete-title"
        aria-modal="true"
        className="grid w-full max-w-md gap-5 rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
        role="dialog"
      >
        <div>
          <h2
            className="text-xl font-black text-blue-950"
            id="language-delete-title"
          >
            Lưu trữ ngôn ngữ
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            Ngôn ngữ {formatNullableText(language.name)} sẽ được chuyển sang
            trạng thái lưu trữ. Bạn vẫn có thể lọc trạng thái lưu trữ để xem lại.
          </p>
        </div>

        {errorMessage ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

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
            {isSubmitting ? 'Đang lưu trữ...' : 'Lưu trữ'}
          </button>
        </div>
      </section>
    </div>
  )
}
