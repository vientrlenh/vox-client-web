import type { RoleCode } from '@/features/auth/types'

export type QuestionBankActorRole = 'SYSTEM_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | null

export function getQuestionBankActorRole(
  roles?: RoleCode[] | null,
): QuestionBankActorRole {
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

export function canManageQuestionBank(role: QuestionBankActorRole) {
  return role === 'SYSTEM_ADMIN' || role === 'SCHOOL_ADMIN'
}
