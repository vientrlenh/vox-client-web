import type { RoleCode } from '@/features/auth/types'

export type FrameworkActorRole =
  | 'SYSTEM_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'TEACHER'
  | null

export function getFrameworkActorRole(
  roles?: RoleCode[] | null,
): FrameworkActorRole {
  if (roles?.includes('SYSTEM_ADMIN')) {
    return 'SYSTEM_ADMIN'
  }

  if (roles?.includes('SCHOOL_ADMIN')) {
    return 'SCHOOL_ADMIN'
  }

  if (roles?.includes('TEACHER')) {
    return 'TEACHER'
  }

  return null
}

export function canManageFramework(role: FrameworkActorRole) {
  return role === 'SYSTEM_ADMIN'
}
