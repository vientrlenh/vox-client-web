import { AlertTriangle } from 'lucide-react'

type WarningBannerProps = {
  message: string | null
  className?: string
  /** 'warning' (mặc định) = còn tiếp tục được; 'danger' = bị chặn hẳn, không có đường tiếp tục. */
  tone?: 'danger' | 'warning'
}

const TONE_CLASSES: Record<'danger' | 'warning', { icon: string; wrapper: string }> = {
  danger: {
    icon: 'border-red-300 bg-red-100 text-red-700',
    wrapper: 'border-red-200 bg-red-50 text-red-700',
  },
  warning: {
    icon: 'border-amber-300 bg-amber-100 text-amber-700',
    wrapper: 'border-amber-200 bg-amber-50 text-amber-800',
  },
}

export function WarningBanner({ message, className, tone = 'warning' }: WarningBannerProps) {
  if (!message) {
    return null
  }

  const toneClasses = TONE_CLASSES[tone]

  return (
    <div
      className={['flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm', toneClasses.wrapper, className]
        .filter(Boolean)
        .join(' ')}
      role="alert"
    >
      <div className={['flex size-8 shrink-0 items-center justify-center rounded-full border', toneClasses.icon].join(' ')}>
        <AlertTriangle aria-hidden="true" className="size-4" />
      </div>
      <div className="flex-1 whitespace-pre-line font-medium">{message}</div>
    </div>
  )
}