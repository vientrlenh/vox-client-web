import type { RoleCode } from '@/features/auth/types'
import type { QuestionBankDto } from './types'

export type QuestionBankActorRole = 'SYSTEM_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | null
export type QuestionBankStatusAction = 'PUBLISH' | 'ARCHIVE'

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

export function canEditQuestionBank(
  bank: QuestionBankDto | null | undefined,
  role: QuestionBankActorRole,
) {
  return canManageQuestionBank(role) && bank?.status === 'DRAFT'
}

export function getQuestionBankStatusActions(
  bank: QuestionBankDto | null | undefined,
  role: QuestionBankActorRole,
) {
  if (!canManageQuestionBank(role) || !bank) {
    return [] as Array<{
      action: QuestionBankStatusAction
      id: string
      label: string
    }>
  }

  const actions: Array<{
    action: QuestionBankStatusAction
    id: string
    label: string
  }> = []

  if (bank.status === 'DRAFT') {
    actions.push({
      action: 'PUBLISH',
      id: 'publish',
      label: 'Publish',
    })
  }

  if (bank.status !== 'ARCHIVED') {
    actions.push({
      action: 'ARCHIVE',
      id: 'archive',
      label: 'Archive',
    })
  }

  return actions
}
