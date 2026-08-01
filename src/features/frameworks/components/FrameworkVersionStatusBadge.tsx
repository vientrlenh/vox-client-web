import { getVersionStatusDisplay } from '../types'
import type { FrameworkVersionStatus } from '../types'

type FrameworkVersionStatusBadgeProps = {
  status?: FrameworkVersionStatus | null
}

export function FrameworkVersionStatusBadge({
  status,
}: FrameworkVersionStatusBadgeProps) {
  const display = getVersionStatusDisplay(status)

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${display.className}`}
    >
      {display.label}
    </span>
  )
}
