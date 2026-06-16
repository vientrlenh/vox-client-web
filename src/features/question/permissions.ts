import type { RoleCode } from '@/features/auth/types'
import type { QuestionDto } from './types'

export type TeacherQuestionContext = 'owner' | 'reviewer' | 'viewer'

export type QuestionActorRole = 'SYSTEM_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | null

type ReviewActionOption = {
  description: string
  requiresReason?: boolean
  status: string
  title: string
}

const EDITABLE_STATUSES = ['DRAFT', 'REJECTED'] as const

function isEditableStatus(status?: string | null) {
  return EDITABLE_STATUSES.includes(status as (typeof EDITABLE_STATUSES)[number])
}

function isApprovedStatus(question?: QuestionDto | null) {
  return question?.status === 'APPROVED'
}

function isReviewerQueue(question?: QuestionDto | null) {
  return (
    question?.status === 'SUBMITTED_FOR_REVIEW' &&
    question.visibility === 'REVIEWER_ONLY'
  )
}

export function getQuestionActorRole(
  roles?: RoleCode[] | null,
): QuestionActorRole {
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

export function getTeacherQuestionContext(
  view?: 'all' | 'my' | 'review' | null,
): TeacherQuestionContext {
  if (view === 'my') {
    return 'owner'
  }

  if (view === 'review') {
    return 'reviewer'
  }

  return 'viewer'
}

export function resolveTeacherQuestionContext(
  view: 'all' | 'my' | 'review' | null | undefined,
  question: QuestionDto | null | undefined,
  userId?: string | null,
): TeacherQuestionContext {
  if (question?.createdBy && userId && question.createdBy === userId) {
    return 'owner'
  }

  return getTeacherQuestionContext(view)
}

export function canCreateQuestion(role: QuestionActorRole) {
  return role === 'SYSTEM_ADMIN' || role === 'TEACHER'
}

export function canEditQuestion(
  question: QuestionDto | null | undefined,
  role: QuestionActorRole,
  teacherContext: TeacherQuestionContext,
) {
  if (!question || question.locked) {
    return false
  }

  if (role === 'SYSTEM_ADMIN') {
    return true
  }

  if (role === 'TEACHER') {
    return teacherContext === 'owner' && isEditableStatus(question.status)
  }

  return false
}

export function canDeleteQuestion(
  question: QuestionDto | null | undefined,
  role: QuestionActorRole,
  teacherContext: TeacherQuestionContext,
) {
  return canEditQuestion(question, role, teacherContext)
}

export function canDeleteQuestionAssetsOrGuide(
  question: QuestionDto | null | undefined,
  role: QuestionActorRole,
  teacherContext: TeacherQuestionContext,
) {
  return (
    canEditQuestion(question, role, teacherContext) && question?.status === 'DRAFT'
  )
}

export function getQuestionReviewActions(
  question: QuestionDto | null | undefined,
  role: QuestionActorRole,
  teacherContext: TeacherQuestionContext,
) {
  if (!question) {
    return [] as ReviewActionOption[]
  }

  if (role === 'SYSTEM_ADMIN') {
    const actions: ReviewActionOption[] = []

    if (isEditableStatus(question.status)) {
      actions.push({
        description: 'Gui cau hoi vao hang doi review.',
        status: 'SUBMITTED_FOR_REVIEW',
        title: 'Submit for review',
      })
    }

    if (question.status === 'SUBMITTED_FOR_REVIEW') {
      actions.push(
        {
          description: 'Duyet cau hoi, chuyen sang trang thai approved.',
          status: 'APPROVED',
          title: 'Approve',
        },
        {
          description: 'Tra cau hoi ve cho nguoi tao chinh sua.',
          requiresReason: true,
          status: 'REVISION_REQUESTED',
          title: 'Request revision',
        },
        {
          description: 'Tu choi cau hoi hien tai.',
          requiresReason: true,
          status: 'REJECTED',
          title: 'Reject',
        },
      )
    }

    if (isApprovedStatus(question)) {
      actions.push({
        description: 'Xuat ban cau hoi da duoc approved.',
        status: 'PUBLISHED',
        title: 'Publish',
      })
    }

    if (question.status !== 'ARCHIVED') {
      actions.push({
        description: 'Chuyen cau hoi sang luu tru.',
        requiresReason: true,
        status: 'ARCHIVED',
        title: 'Archive',
      })
    }

    if (question.status === 'ARCHIVED') {
      actions.push({
        description: 'Khoi phuc cau hoi ve trang thai draft neu backend cho phep.',
        status: 'DRAFT',
        title: 'Restore to draft',
      })
    }

    return actions
  }

  if (role === 'SCHOOL_ADMIN') {
    const actions: ReviewActionOption[] = []

    if (isEditableStatus(question.status)) {
      actions.push({
        description: 'Gui cau hoi vao hang doi review.',
        status: 'SUBMITTED_FOR_REVIEW',
        title: 'Submit for review',
      })
    }

    if (question.status === 'SUBMITTED_FOR_REVIEW') {
      actions.push(
        {
          description: 'Duyet cau hoi, chuyen sang trang thai approved.',
          status: 'APPROVED',
          title: 'Approve',
        },
        {
          description: 'Tra cau hoi ve cho nguoi tao chinh sua.',
          requiresReason: true,
          status: 'REVISION_REQUESTED',
          title: 'Request revision',
        },
        {
          description: 'Tu choi cau hoi hien tai.',
          requiresReason: true,
          status: 'REJECTED',
          title: 'Reject',
        },
      )
    }

    if (isApprovedStatus(question)) {
      actions.push({
        description: 'Xuat ban cau hoi da duoc approved.',
        status: 'PUBLISHED',
        title: 'Publish',
      })
    }

    if (question.status !== 'ARCHIVED') {
      actions.push({
        description: 'Chuyen cau hoi sang luu tru.',
        requiresReason: true,
        status: 'ARCHIVED',
        title: 'Archive',
      })
    }

    if (question.status === 'ARCHIVED') {
      actions.push({
        description: 'Khoi phuc cau hoi ve trang thai draft.',
        status: 'DRAFT',
        title: 'Restore to draft',
      })
    }

    return actions
  }

  if (role !== 'TEACHER') {
    return []
  }

  if (teacherContext === 'reviewer' && isReviewerQueue(question)) {
    return [
      {
        description: 'Duyet cau hoi, chuyen sang trang thai approved.',
        status: 'APPROVED',
        title: 'Approve',
      },
      {
        description: 'Yeu cau nguoi tao chinh sua them.',
        requiresReason: true,
        status: 'REVISION_REQUESTED',
        title: 'Request revision',
      },
      {
        description: 'Tu choi cau hoi hien tai.',
        requiresReason: true,
        status: 'REJECTED',
        title: 'Reject',
      },
    ]
  }

  if (teacherContext === 'owner' && isEditableStatus(question.status)) {
    return [
      {
        description: 'Gui cau hoi vao hang doi review.',
        status: 'SUBMITTED_FOR_REVIEW',
        title: 'Submit for review',
      },
      {
        description: 'Chuyen cau hoi sang luu tru.',
        requiresReason: true,
        status: 'ARCHIVED',
        title: 'Archive',
      },
    ]
  }

  if (teacherContext === 'owner' && isApprovedStatus(question)) {
    return [
      {
        description: 'Xuat ban cau hoi sau khi da duoc approved.',
        status: 'PUBLISHED',
        title: 'Publish',
      },
      {
        description: 'Chuyen cau hoi sang luu tru.',
        requiresReason: true,
        status: 'ARCHIVED',
        title: 'Archive',
      },
    ]
  }

  if (teacherContext === 'owner' && question.status === 'ARCHIVED') {
    return [
      {
        description: 'Khoi phuc cau hoi cua ban ve trang thai draft.',
        status: 'DRAFT',
        title: 'Restore to draft',
      },
    ]
  }

  if (
    teacherContext === 'owner' &&
    question.status &&
    question.status !== 'ARCHIVED' &&
    question.status !== 'PUBLISHED'
  ) {
    return [
      {
        description: 'Chuyen cau hoi sang luu tru.',
        requiresReason: true,
        status: 'ARCHIVED',
        title: 'Archive',
      },
    ]
  }

  return []
}
