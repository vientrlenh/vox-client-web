import { getVerifiedDisplay } from '../types'

type SchoolDirectoryVerifiedBadgeProps = {
  verified?: boolean | null
}

export function SchoolDirectoryVerifiedBadge({
  verified,
}: SchoolDirectoryVerifiedBadgeProps) {
  const status = getVerifiedDisplay(verified)

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${status.className}`}
    >
      {status.label}
    </span>
  )
}
