import type { ActionMenuItem } from '@/shared/ui/ActionMenuButton'
import type { RoleCode } from '@/features/auth/types'
import type { QuestionTopicDto } from './types'

export type QuestionTopicActorRole =
  | 'SYSTEM_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'TEACHER'
  | null

export function getQuestionTopicActorRole(
  roles?: RoleCode[] | null,
): QuestionTopicActorRole {
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

export function canManageQuestionTopic(role: QuestionTopicActorRole) {
  return role === 'SYSTEM_ADMIN' || role === 'SCHOOL_ADMIN'
}

export function canEditQuestionTopic(
  topic: QuestionTopicDto | null | undefined,
  role: QuestionTopicActorRole,
) {
  return canManageQuestionTopic(role) && topic?.status !== 'ARCHIVED'
}

export function canDeleteQuestionTopic(
  topic: QuestionTopicDto | null | undefined,
  role: QuestionTopicActorRole,
) {
  return canManageQuestionTopic(role) && topic?.status === 'DRAFT'
}

export function getQuestionTopicReviewActions(
  topic: QuestionTopicDto | null | undefined,
  role: QuestionTopicActorRole,
  handlers: {
    onArchive: () => void
    onPublish: () => void
    onReject: () => void
    onRequestRevision: () => void
    onSubmitForReview: () => void
  },
) {
  if (!canManageQuestionTopic(role) || !topic) {
    return [] as ActionMenuItem[]
  }

  const items: ActionMenuItem[] = []

  if (['DRAFT', 'REVISION_REQUESTED', 'REJECTED'].includes(topic.status)) {
    items.push({
      id: 'submit-review',
      label: 'Submit for review',
      onSelect: handlers.onSubmitForReview,
      tone: 'primary',
    })
  }

  if (topic.status === 'SUBMITTED_FOR_REVIEW') {
    items.push(
      {
        id: 'publish',
        label: 'Publish',
        onSelect: handlers.onPublish,
        tone: 'success',
      },
      {
        id: 'request-revision',
        label: 'Request revision',
        onSelect: handlers.onRequestRevision,
        tone: 'default',
      },
      {
        id: 'reject',
        label: 'Reject',
        onSelect: handlers.onReject,
        tone: 'danger',
      },
    )
  }

  if (topic.status !== 'ARCHIVED') {
    items.push({
      id: 'archive',
      label: 'Archive',
      onSelect: handlers.onArchive,
      tone: 'default',
    })
  }

  return items
}
