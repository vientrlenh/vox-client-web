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

export function getQuestionBankReviewActions(role: QuestionBankActorRole) {
  if (!canManageQuestionBank(role)) {
    return []
  }

  return [
    { id: 'submit-review', label: 'Submit for review', status: 'SUBMITTED_FOR_REVIEW' },
    { id: 'publish', label: 'Publish', status: 'PUBLISHED' },
    { id: 'request-revision', label: 'Request revision', status: 'REVISION_REQUESTED' },
    { id: 'reject', label: 'Reject', status: 'REJECTED' },
    { id: 'archive', label: 'Archive', status: 'ARCHIVED' },
  ]
}
