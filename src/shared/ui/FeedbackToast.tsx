import { Check, X } from 'lucide-react'
import { useEffect } from 'react'

type FeedbackToastProps = {
  message: string | null
  onClose: () => void
  tone: 'error' | 'success'
}

export function FeedbackToast({ message, onClose, tone }: FeedbackToastProps) {
  useEffect(() => {
    if (!message) {
      return
    }

    const timeoutId = window.setTimeout(onClose, tone === 'success' ? 3200 : 4500)
    return () => window.clearTimeout(timeoutId)
  }, [message, onClose, tone])

  if (!message) {
    return null
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
      <div
        className={[
          'pointer-events-auto min-w-[280px] max-w-md rounded-2xl border px-4 py-3 shadow-lg backdrop-blur',
          tone === 'success'
            ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
            : 'border-red-200 bg-red-50/95 text-red-800',
        ].join(' ')}
        role={tone === 'error' ? 'alert' : 'status'}
      >
        <div className="flex items-start gap-3">
          <div
            className={[
              'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border',
              tone === 'success'
                ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                : 'border-red-300 bg-red-100 text-red-700',
            ].join(' ')}
          >
            {tone === 'success' ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <X aria-hidden="true" className="size-4" />
            )}
          </div>
          <div className="flex-1 text-sm font-semibold">{message}</div>
          <button
            aria-label="Dong thong bao"
            className="opacity-70 transition hover:opacity-100"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
