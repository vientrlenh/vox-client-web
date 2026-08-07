import { Archive, BadgeCheck } from 'lucide-react'
import type { ActionMenuItem } from '@/shared/ui/ActionMenuButton'
import type { RoleCode } from '@/features/auth/types'
import type { QuestionBankDto } from './types'

export type QuestionBankActorRole = 'SYSTEM_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | null
export type QuestionBankStatusAction = 'PUBLISH' | 'ARCHIVE'

export type QuestionBankStatusActionItem = {
  action: QuestionBankStatusAction
  icon: ActionMenuItem['icon']
  id: string
  label: string
}

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

export function canDeleteQuestionBank(
  bank: QuestionBankDto | null | undefined,
  role: QuestionBankActorRole,
) {
  return canManageQuestionBank(role) && bank?.status === 'DRAFT'
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
    return [] as QuestionBankStatusActionItem[]
  }

  const actions: QuestionBankStatusActionItem[] = []

  if (bank.status === 'DRAFT') {
    actions.push({
      action: 'PUBLISH',
      icon: BadgeCheck,
      id: 'publish',
      label: 'Xuất bản',
    })
  }

  if (bank.status !== 'ARCHIVED') {
    actions.push({
      action: 'ARCHIVE',
      icon: Archive,
      id: 'archive',
      label: 'Lưu trữ',
    })
  }

  return actions
}
