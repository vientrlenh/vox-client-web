import { getRegisterFormStatusDisplay } from '../types'

type RegistrationStatusBadgeProps = {
  status?: string | null
}

export function RegistrationStatusBadge({
  status,
}: RegistrationStatusBadgeProps) {
  const statusDisplay = getRegisterFormStatusDisplay(status)

  return (
    <span
      className={[
        'inline-flex min-h-8 items-center rounded-md border px-3 text-xs font-bold',
        statusDisplay.className,
      ].join(' ')}
    >
      {statusDisplay.label}
    </span>
  )
}
