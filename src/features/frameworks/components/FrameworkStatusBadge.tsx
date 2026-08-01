import { getFrameworkStatusDisplay } from '../types'

type FrameworkStatusBadgeProps = {
  isActive?: boolean | null
}

export function FrameworkStatusBadge({ isActive }: FrameworkStatusBadgeProps) {
  const status = getFrameworkStatusDisplay(isActive)

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${status.className}`}
    >
      {status.label}
    </span>
  )
}
