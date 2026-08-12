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

/**
 * `createdBy` có thể là userId hoặc email tùy nguồn dữ liệu, nên phải so cả hai.
 * Tách riêng khỏi {@link isQuestionOwner} để chỗ nào chỉ có mỗi `createdBy` (vd bản chụp
 * lựa chọn hàng loạt) vẫn dùng đúng một quy tắc so khớp.
 */
export function isCreatedBy(
  createdBy?: string | null,
  userId?: string | null,
  email?: string | null,
) {
  if (!createdBy) {
    return false
  }

  const normalizedCreatedBy = createdBy.trim().toLowerCase()
  const normalizedUserId = userId?.trim().toLowerCase()
  const normalizedEmail = email?.trim().toLowerCase()

  return (
    normalizedCreatedBy === normalizedUserId || normalizedCreatedBy === normalizedEmail
  )
}

function isQuestionOwner(
  question: QuestionDto | null | undefined,
  userId?: string | null,
  email?: string | null,
) {
  return isCreatedBy(question?.createdBy, userId, email)
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
  email?: string | null,
): TeacherQuestionContext {
  if (isQuestionOwner(question, userId, email)) {
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
  email?: string | null,
) {
  if (!question) {
    return false
  }

  return role === 'TEACHER' && isQuestionOwner(question, userId, email)
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
  email?: string | null,
) {
  if (!question) {
    return [] as ReviewActionOption[]
  }

  const isOwner = isQuestionOwner(question, userId, email)
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
      description: 'Gửi câu hỏi vào hàng đợi duyệt.',
      title: 'Gửi duyệt',
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
        description: 'Phê duyệt câu hỏi để chuyển sang trạng thái Đã duyệt.',
        title: 'Phê duyệt',
      },
      {
        action: 'REQUEST_REVISION',
        description: 'Yêu cầu tác giả chỉnh sửa câu hỏi.',
        requiresNote: true,
        title: 'Yêu cầu chỉnh sửa',
      },
      {
        action: 'REJECT',
        description: 'Từ chối câu hỏi hiện tại.',
        requiresNote: true,
        title: 'Từ chối',
      },
    )
  }

  if (
    (teacherContext === 'owner' || collaboratorPermission === 'CAN_EDIT') &&
    question.status === 'APPROVED'
  ) {
    actions.push({
      action: 'PUBLISH',
      description: 'Xuất bản câu hỏi đã duyệt để đưa vào sử dụng ngay.',
      title: 'Xuất bản',
    })
  }

  if (
    (teacherContext === 'owner' || collaboratorPermission === 'CAN_EDIT') &&
    question.status === 'PUBLISHED'
  ) {
    actions.push({
      action: 'ARCHIVE',
      description: 'Lưu trữ câu hỏi đã xuất bản khi tạm ngừng sử dụng.',
      title: 'Lưu trữ',
    })
  }

  if (
    (teacherContext === 'owner' || collaboratorPermission === 'CAN_EDIT') &&
    question.status === 'ARCHIVED'
  ) {
    actions.push({
      action: 'PUBLISH',
      description: 'Xuất bản lại câu hỏi từ trạng thái Lưu trữ.',
      title: 'Xuất bản lại',
    })
  }

  return actions
}

function getAdminActions(status?: QuestionStatus | null) {
  const actions: ReviewActionOption[] = []

  if (status && isEditableStatus(status)) {
    actions.push({
      action: 'SUBMIT',
      description: 'Gửi câu hỏi vào hàng đợi duyệt.',
      title: 'Gửi duyệt',
    })
  }

  if (status === 'SUBMITTED_FOR_REVIEW') {
    actions.push(
      {
        action: 'APPROVE',
        description: 'Phê duyệt câu hỏi.',
        title: 'Phê duyệt',
      },
      {
        action: 'REQUEST_REVISION',
        description: 'Yêu cầu chỉnh sửa câu hỏi.',
        requiresNote: true,
        title: 'Yêu cầu chỉnh sửa',
      },
      {
        action: 'REJECT',
        description: 'Từ chối câu hỏi.',
        requiresNote: true,
        title: 'Từ chối',
      },
    )
  }

  if (status === 'APPROVED') {
    actions.push({
      action: 'PUBLISH',
      description: 'Xuất bản câu hỏi.',
      title: 'Xuất bản',
    })
  }

  if (status === 'PUBLISHED') {
    actions.push({
      action: 'ARCHIVE',
      description: 'Ngừng triển khai và đưa câu hỏi vào lưu trữ.',
      title: 'Lưu trữ',
    })
  }

  if (status === 'ARCHIVED') {
    actions.push({
      action: 'PUBLISH',
      description: 'Mở lại câu hỏi đã lưu trữ để tiếp tục sử dụng.',
      title: 'Xuất bản lại',
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
        description: 'Phê duyệt câu hỏi.',
        title: 'Phê duyệt',
      },
      {
        action: 'REQUEST_REVISION',
        description: 'Yêu cầu chỉnh sửa câu hỏi.',
        requiresNote: true,
        title: 'Yêu cầu chỉnh sửa',
      },
      {
        action: 'REJECT',
        description: 'Từ chối câu hỏi.',
        requiresNote: true,
        title: 'Từ chối',
      },
    )
  }

  if (status === 'APPROVED') {
    actions.push({
      action: 'PUBLISH',
      description: 'Xuất bản câu hỏi đã duyệt.',
      title: 'Xuất bản',
    })
  }

  if (status === 'PUBLISHED') {
    actions.push({
      action: 'ARCHIVE',
      description: 'Lưu trữ câu hỏi đã triển khai.',
      title: 'Lưu trữ',
    })
  }

  if (status === 'ARCHIVED') {
    actions.push({
      action: 'PUBLISH',
      description: 'Xuất bản lại câu hỏi từ trạng thái Lưu trữ.',
      title: 'Xuất bản lại',
    })
  }

  return actions
}
