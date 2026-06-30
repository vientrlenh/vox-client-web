import type { RoleCode } from '@/features/auth/types'
import type {
  QuestionCollaboratorPermission,
  QuestionDto,
  QuestionStatus,
} from './types'

export type TeacherQuestionContext =
  | 'collaborator'
  | 'owner'
  | 'reviewer'
  | 'viewer'

export type QuestionActorRole =
  | 'SYSTEM_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'TEACHER'
  | null

export type QuestionWorkflowAction =
  | 'APPROVE'
  | 'ARCHIVE'
  | 'PUBLISH'
  | 'REJECT'
  | 'REQUEST_REVISION'
  | 'SUBMIT'

export type ReviewActionOption = {
  action: QuestionWorkflowAction
  description: string
  requiresNote?: boolean
  title: string
}

const EDITABLE_STATUSES: QuestionStatus[] = ['DRAFT', 'REVISION_REQUESTED']

function isEditableStatus(status?: QuestionStatus | null) {
  return Boolean(status && EDITABLE_STATUSES.includes(status))
}

function getCurrentUserPermission(
  question: QuestionDto | null | undefined,
  userId?: string | null,
): QuestionCollaboratorPermission | null {
  if (!question || !userId) {
    return null
  }

  const collaborator = question.collaborators?.find((item) => item.userId === userId)
  return collaborator?.permission ?? null
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

  if (getCurrentUserPermission(question, userId)) {
    return 'collaborator'
  }

  return getTeacherQuestionContext(view)
}

export function canCreateQuestion(role: QuestionActorRole) {
  return role === 'SYSTEM_ADMIN' || role === 'TEACHER'
}

export function canManageQuestionSharing(
  question: QuestionDto | null | undefined,
  role: QuestionActorRole,
  userId?: string | null,
) {
  if (!question) {
    return false
  }

  return role === 'TEACHER' && Boolean(question.createdBy && userId && question.createdBy === userId)
}

export function canEditQuestion(
  question: QuestionDto | null | undefined,
  role: QuestionActorRole,
  teacherContext: TeacherQuestionContext,
  userId?: string | null,
) {
  if (!question) {
    return false
  }

  if (role === 'SYSTEM_ADMIN') {
    return true
  }

  if (role !== 'TEACHER') {
    return false
  }

  if (teacherContext === 'owner') {
    return isEditableStatus(question.status)
  }

  if (teacherContext === 'collaborator') {
    return (
      getCurrentUserPermission(question, userId) === 'CAN_EDIT' &&
      isEditableStatus(question.status)
    )
  }

  return false
}

export function canDeleteQuestion(
  question: QuestionDto | null | undefined,
  role: QuestionActorRole,
  teacherContext: TeacherQuestionContext,
) {
  if (!question) {
    return false
  }

  if (role === 'SYSTEM_ADMIN' || role === 'SCHOOL_ADMIN') {
    return true
  }

  return teacherContext === 'owner' && question.status === 'DRAFT'
}

export function canEditQuestionAssetsOrGuide(
  question: QuestionDto | null | undefined,
  role: QuestionActorRole,
  teacherContext: TeacherQuestionContext,
  userId?: string | null,
) {
  return canEditQuestion(question, role, teacherContext, userId)
}

export function getQuestionReviewActions(
  question: QuestionDto | null | undefined,
  role: QuestionActorRole,
  teacherContext: TeacherQuestionContext,
  userId?: string | null,
) {
  if (!question) {
    return [] as ReviewActionOption[]
  }

  const isOwner = Boolean(question.createdBy && userId && question.createdBy === userId)
  const collaboratorPermission = getCurrentUserPermission(question, userId)

  if (role === 'SYSTEM_ADMIN') {
    return getAdminActions(question.status)
  }

  if (role === 'SCHOOL_ADMIN') {
    return getSchoolAdminActions(question.status)
  }

  if (role !== 'TEACHER') {
    return []
  }

  const actions: ReviewActionOption[] = []

  if (
    (teacherContext === 'owner' || collaboratorPermission === 'CAN_EDIT') &&
    isEditableStatus(question.status)
  ) {
    actions.push({
      action: 'SUBMIT',
      description: 'Gui cau hoi vao hang doi duyet.',
      title: 'Submit',
    })
  }

  if (
    collaboratorPermission === 'CAN_EDIT' &&
    !isOwner &&
    question.status === 'SUBMITTED_FOR_REVIEW'
  ) {
    actions.push(
      {
        action: 'APPROVE',
        description: 'Duyet cau hoi de chuyen sang approved.',
        title: 'Approve',
      },
      {
        action: 'REQUEST_REVISION',
        description: 'Yeu cau tac gia sua cau hoi.',
        requiresNote: true,
        title: 'Request revision',
      },
      {
        action: 'REJECT',
        description: 'Tu choi cau hoi hien tai.',
        requiresNote: true,
        title: 'Reject',
      },
    )
  }

  return actions
}

function getAdminActions(status?: QuestionStatus | null) {
  const actions: ReviewActionOption[] = []

  if (status && isEditableStatus(status)) {
    actions.push({
      action: 'SUBMIT',
      description: 'Gui cau hoi vao hang doi duyet.',
      title: 'Submit',
    })
  }

  if (status === 'SUBMITTED_FOR_REVIEW') {
    actions.push(
      {
        action: 'APPROVE',
        description: 'Duyet cau hoi.',
        title: 'Approve',
      },
      {
        action: 'REQUEST_REVISION',
        description: 'Yeu cau chinh sua cau hoi.',
        requiresNote: true,
        title: 'Request revision',
      },
      {
        action: 'REJECT',
        description: 'Tu choi cau hoi.',
        requiresNote: true,
        title: 'Reject',
      },
    )
  }

  if (status === 'APPROVED') {
    actions.push({
      action: 'PUBLISH',
      description: 'Xuat ban cau hoi.',
      title: 'Publish',
    })
  }

  if (status === 'PUBLISHED') {
    actions.push({
      action: 'ARCHIVE',
      description: 'Ngung trien khai va dua cau hoi vao luu tru.',
      title: 'Archive',
    })
  }

  if (status === 'ARCHIVED') {
    actions.push({
      action: 'PUBLISH',
      description: 'Mo lai cau hoi da luu tru de tiep tuc su dung.',
      title: 'Republish',
    })
  }

  return actions
}

function getSchoolAdminActions(status?: QuestionStatus | null) {
  const actions: ReviewActionOption[] = []

  if (status === 'SUBMITTED_FOR_REVIEW') {
    actions.push(
      {
        action: 'APPROVE',
        description: 'Duyet cau hoi.',
        title: 'Approve',
      },
      {
        action: 'REQUEST_REVISION',
        description: 'Yeu cau chinh sua cau hoi.',
        requiresNote: true,
        title: 'Request revision',
      },
      {
        action: 'REJECT',
        description: 'Tu choi cau hoi.',
        requiresNote: true,
        title: 'Reject',
      },
    )
  }

  if (status === 'APPROVED') {
    actions.push({
      action: 'PUBLISH',
      description: 'Xuat ban cau hoi da duyet.',
      title: 'Publish',
    })
  }

  if (status === 'PUBLISHED') {
    actions.push({
      action: 'ARCHIVE',
      description: 'Luu tru cau hoi da trien khai.',
      title: 'Archive',
    })
  }

  if (status === 'ARCHIVED') {
    actions.push({
      action: 'PUBLISH',
      description: 'Xuat ban lai cau hoi tu trang thai luu tru.',
      title: 'Republish',
    })
  }

  return actions
}
