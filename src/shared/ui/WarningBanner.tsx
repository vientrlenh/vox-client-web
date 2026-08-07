import { AlertTriangle } from 'lucide-react'

type WarningBannerProps = {
  message: string | null
  className?: string
}

export function WarningBanner({ message, className }: WarningBannerProps) {
  if (!message) {
    return null
  }

  return (
    <div
      className={[
        'flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="alert"
    >
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-amber-700">
        <AlertTriangle aria-hidden="true" className="size-4" />
      </div>
      <div className="flex-1 whitespace-pre-line font-medium">{message}</div>
    </div>
  )
}