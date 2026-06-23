import { getLanguageStatusDisplay } from '../types'

type LanguageStatusBadgeProps = {
  isActive?: boolean | null
}

export function LanguageStatusBadge({ isActive }: LanguageStatusBadgeProps) {
  const status = getLanguageStatusDisplay(isActive)

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${status.className}`}
    >
      {status.label}
    </span>
  )
}
