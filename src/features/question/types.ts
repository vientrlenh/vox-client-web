export type QuestionType =
  | 'READ_ALOUD'
  | 'SHORT_ANSWER'
  | 'LONG_ANSWER'
  | 'OPINION'
  | 'DESCRIPTION'

export type QuestionSharing = 'PRIVATE' | 'SCHOOL_SHARED'

export type QuestionStatus =
  | 'DRAFT'
  | 'SUBMITTED_FOR_REVIEW'
  | 'REVISION_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'ARCHIVED'

export type QuestionConfidentiality =
  | 'OPEN'
  | 'EXAM_RESTRICTED'
  | 'RELEASED'

export type QuestionCollaboratorPermission =
  | 'READ_ONLY'
  | 'CAN_USE'
  | 'CAN_EDIT'

export type QuestionScope = 'MINE' | 'COLLABORATING' | 'ALL'

export type QuestionAssetType = 'AUDIO' | 'IMAGE' | 'VIDEO' | 'TEXT_PASSAGE'

export type QuestionAssetDto = {
  id: string
  questionId: string
  title: string | null
  durationSeconds: number | null
  altText: string | null
  type: QuestionAssetType
  url: string
  transcript: string | null
  description: string | null
  order: number
}

export type QuestionEvaluationGuideDto = {
  id: string
  questionId: string
  expectedContent: string | null
  keyPoints: string | null
  acceptableResponses: string | null
  offTopicExamples: string | null
  scoringHints: string | null
  commonMistakes: string | null
}

export type QuestionCollaboratorDto = {
  id: string
  userId: string
  questionId: string
  permission: QuestionCollaboratorPermission
  assignedAt: string | null
}

export type QuestionBankRefDto = {
  id: string
  languageId?: string | null
  schoolId?: string | null
  code: string
  name: string
  description: string | null
  ownerType?: 'SYSTEM' | 'SCHOOL'
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
}

export type QuestionTopicRefDto = {
  id: string
  questionBankId: string
  code: string
  name: string
  description: string | null
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
}

export type QuestionDto = {
  id: string
  questionBankId: string
  questionTopicId: string
  topicId?: string
  code: string
  instructionText: string | null
  questionText: string
  promptText: string | null
  preparationText: string | null
  type: QuestionType
  questionType?: QuestionType
  preparationTimeSeconds: number
  minResponseSeconds: number
  maxResponseSeconds: number
  durationSeconds?: number
  sharing: QuestionSharing
  scope?: string
  visibility?: string
  sourceQuestionId: string | null
  locked: boolean
  status: QuestionStatus
  confidentiality: QuestionConfidentiality
  securePoolId: string | null
  audioUrl?: string | null
  standardLevelId?: string | null
  isActive?: boolean
  createdAt: string | null
  updatedAt: string | null
  createdBy: string | null
  updatedBy: string | null
  topic?: QuestionTopicRefDto | null
  bank?: QuestionBankRefDto | null
  assets?: QuestionAssetDto[] | null
  evaluationGuide?: QuestionEvaluationGuideDto | null
  collaborators?: QuestionCollaboratorDto[] | null
}

export type QuestionPage = {
  content: QuestionDto[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type CreateQuestionRequest = {
  questionBankId?: string
  questionTopicId?: string
  topicId?: string
  instructionText?: string | null
  questionText: string
  promptText?: string | null
  preparationText?: string | null
  type?: QuestionType
  questionType?: string
  preparationTimeSeconds?: number
  minResponseSeconds?: number
  maxResponseSeconds?: number
  sharing?: QuestionSharing
  scope?: string
  visibility?: string
  audioUrl?: string | null
  durationSeconds?: number
  standardLevelId?: string | null
  assets?: Array<{
    title?: string | null
    durationSeconds?: number | null
    altText?: string | null
    type: QuestionAssetType
    url: string
    transcript?: string | null
    description?: string | null
    order: number
  }>
  evaluationGuide?: {
    expectedContent?: string | null
    keyPoints?: string | null
    acceptableResponses?: string | null
    offTopicExamples?: string | null
    scoringHints?: string | null
    commonMistakes?: string | null
  } | null
}

export type UpdateQuestionRequest = {
  questionTopicId?: string
  topicId?: string
  instructionText?: string | null
  questionText?: string | null
  promptText?: string | null
  preparationText?: string | null
  type?: QuestionType
  questionType?: string
  preparationTimeSeconds?: number
  minResponseSeconds?: number
  maxResponseSeconds?: number
  sharing?: QuestionSharing
  scope?: string
  visibility?: string
  audioUrl?: string | null
  durationSeconds?: number
  standardLevelId?: string | null
  isActive?: boolean
}

export type CreateQuestionAssetRequest = {
  title?: string | null
  durationSeconds?: number | null
  altText?: string | null
  type: QuestionAssetType
  url: string
  transcript?: string | null
  description?: string | null
  order: number
}

export type UpdateQuestionAssetRequest = {
  title?: string | null
  durationSeconds?: number | null
  altText?: string | null
  type?: QuestionAssetType
  url?: string | null
  transcript?: string | null
  description?: string | null
  order?: number
}

export type UpsertQuestionEvaluationGuideRequest = {
  expectedContent?: string | null
  keyPoints?: string | null
  acceptableResponses?: string | null
  offTopicExamples?: string | null
  scoringHints?: string | null
  commonMistakes?: string | null
}

export type UpdateQuestionStatusRequest = {
  action:
    | 'SUBMIT'
    | 'APPROVE'
    | 'REJECT'
    | 'REQUEST_REVISION'
    | 'PUBLISH'
    | 'ARCHIVE'
    | 'LOCK'
    | 'UNLOCK'
  note?: string | null
}

export type CreateQuestionCollaboratorRequest = {
  userId: string
  permission: QuestionCollaboratorPermission
}

export type UpdateQuestionCollaboratorRequest = {
  permission: QuestionCollaboratorPermission
}

export function formatQuestionDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)

  if (isoDate) {
    const [, year, month, day] = isoDate
    return `${day}/${month}/${year}`
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatNullableText(value?: string | null) {
  return value?.trim() ? value : '-'
}

export function formatDuration(seconds?: number | null) {
  if (seconds == null || seconds <= 0) {
    return '-'
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) {
    return `${remainingSeconds} giay`
  }

  if (remainingSeconds === 0) {
    return `${minutes} phut`
  }

  return `${minutes} phut ${remainingSeconds} giay`
}

export function getQuestionTypeDisplay(type?: QuestionType | null) {
  const map: Record<QuestionType, string> = {
    READ_ALOUD: 'Doc to',
    SHORT_ANSWER: 'Tra loi ngan',
    LONG_ANSWER: 'Tra loi dai',
    OPINION: 'Y kien',
    DESCRIPTION: 'Mo ta',
  }

  return type ? map[type] ?? type : '-'
}

export function getQuestionStatusDisplay(status?: QuestionStatus | null) {
  switch (status) {
    case 'APPROVED':
      return {
        className: 'border-teal-200 bg-teal-50 text-teal-700',
        label: 'Da duyet',
      }
    case 'PUBLISHED':
      return {
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        label: 'Da xuat ban',
      }
    case 'DRAFT':
      return {
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        label: 'Ban nhap',
      }
    case 'SUBMITTED_FOR_REVIEW':
      return {
        className: 'border-blue-200 bg-blue-50 text-blue-700',
        label: 'Cho duyet',
      }
    case 'REVISION_REQUESTED':
      return {
        className: 'border-orange-200 bg-orange-50 text-orange-700',
        label: 'Yeu cau sua',
      }
    case 'REJECTED':
      return {
        className: 'border-red-200 bg-red-50 text-red-700',
        label: 'Bi tu choi',
      }
    case 'ARCHIVED':
      return {
        className: 'border-slate-200 bg-slate-50 text-slate-500',
        label: 'Luu tru',
      }
    default:
      return {
        className: 'border-slate-200 bg-slate-50 text-slate-600',
        label: String(status ?? '-'),
      }
  }
}

export function getQuestionSharingDisplay(sharing?: QuestionSharing | null) {
  switch (sharing) {
    case 'PRIVATE':
      return 'Private'
    case 'SCHOOL_SHARED':
      return 'School shared'
    default:
      return String(sharing ?? '-')
  }
}

export function getQuestionConfidentialityDisplay(
  confidentiality?: QuestionConfidentiality | null,
) {
  switch (confidentiality) {
    case 'OPEN':
      return 'Open'
    case 'EXAM_RESTRICTED':
      return 'Exam restricted'
    case 'RELEASED':
      return 'Released'
    default:
      return String(confidentiality ?? '-')
  }
}

export function getQuestionCollaboratorPermissionDisplay(
  permission?: QuestionCollaboratorPermission | null,
) {
  switch (permission) {
    case 'READ_ONLY':
      return 'Read only'
    case 'CAN_USE':
      return 'Can use'
    case 'CAN_EDIT':
      return 'Can edit'
    default:
      return String(permission ?? '-')
  }
}
