import type { Role } from '../types'
import { getRoleDisplay } from '../types'

type RoleBadgesProps = {
  roles?: Role[] | null
}

export function RoleBadges({ roles }: RoleBadgesProps) {
  const visibleRoles = (roles ?? []).filter((role) => {
    const code = role.code?.trim().toUpperCase()
    return code === 'STUDENT' || code === 'TEACHER'
  })

  if (!visibleRoles.length) {
    return <span className="text-sm font-semibold text-slate-400">-</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleRoles.map((role) => {
        const display = getRoleDisplay(role.code)

        return (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${display.className}`}
            key={role.id}
          >
            {display.label}
          </span>
        )
      })}
    </div>
  )
}
