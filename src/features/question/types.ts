export type QuestionType =
  | 'READ_ALOUD'
  | 'SHORT_ANSWER'
  | 'LONG_ANSWER'
  | 'OPINION'
  | 'DESCRIPTION'

export type QuestionAssetDto = {
  id: string
  questionId: string
  title: string | null
  durationSeconds: number | null
  altText: string | null
  type: string
  url: string | null
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

export type QuestionDto = {
  id: string
  questionTopicId?: string
  topicId?: string
  code: string
  instructionText: string | null
  questionText: string
  promptText: string | null
  preparationText: string | null
  type: QuestionType | string
  questionType?: QuestionType | string
  preparationTimeSeconds: number
  minResponseSeconds: number
  maxResponseSeconds: number
  durationSeconds?: number
  scope: string
  visibility: string
  sourceQuestionId: string | null
  locked: boolean
  status: string
  isActive?: boolean
  audioUrl?: string | null
  standardLevelId?: string | null
  standardLevelCode?: string | null
  frameworkCode?: string | null
  frameworkName?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  questionTopic?: QuestionTopicDto | null
  topic?: QuestionTopicDto | null
  assets?: QuestionAssetDto[] | null
  evaluationGuide?: QuestionEvaluationGuideDto | null
}

type QuestionTopicDto = {
  id: string
  questionBankId: string
  code: string
  name: string
}

export type QuestionPage = {
  content: QuestionDto[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type CreateQuestionRequest = {
  questionTopicId?: string
  topicId?: string
  code?: string
  questionText: string
  scope?: string
  visibility?: string
  instructionText?: string | null
  promptText?: string | null
  preparationText?: string | null
  type?: string
  questionType?: string
  preparationTimeSeconds?: number
  minResponseSeconds?: number
  maxResponseSeconds?: number
  durationSeconds?: number
  audioUrl?: string | null
  standardLevelId?: string | null
}

export type UpdateQuestionRequest = {
  questionTopicId?: string
  topicId?: string
  questionText: string
  scope?: string
  visibility?: string
  instructionText?: string | null
  promptText?: string | null
  preparationText?: string | null
  type?: string
  questionType?: string
  preparationTimeSeconds?: number
  minResponseSeconds?: number
  maxResponseSeconds?: number
  durationSeconds?: number
  audioUrl?: string | null
  standardLevelId?: string | null
  isActive?: boolean
}

export type QuestionAssetInput = {
  title: string | null
  durationSeconds: number | null
  altText: string | null
  type: string
  url: string | null
  transcript: string | null
  description: string | null
  order: number
}

export type UpdateQuestionAssetsRequest = {
  assets: QuestionAssetInput[]
}

export type UpdateQuestionEvaluationGuideRequest = {
  expectedContent: string | null
  keyPoints: string | null
  acceptableResponses: string | null
  offTopicExamples: string | null
  scoringHints: string | null
  commonMistakes: string | null
}

export type ReviewQuestionRequest = {
  targetStatus: string
  note: string | null
  reason: string | null
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

export function formatDuration(seconds: number) {
  if (seconds <= 0) {
    return '-'
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) {
    return `${remainingSeconds} giây`
  }

  if (remainingSeconds === 0) {
    return `${minutes} phút`
  }

  return `${minutes} phút ${remainingSeconds} giây`
}

export function getQuestionTypeDisplay(type: QuestionType | string) {
  const map: Record<QuestionType, string> = {
    READ_ALOUD: 'Đọc to',
    SHORT_ANSWER: 'Trả lời ngắn',
    LONG_ANSWER: 'Trả lời dài',
    OPINION: 'Ý kiến',
    DESCRIPTION: 'Mô tả',
  }

  return map[type as QuestionType] ?? type ?? '-'
}

export function getQuestionStatusDisplay(status?: string | null) {
  switch (status) {
    case 'APPROVED':
      return {
        className: 'border-teal-200 bg-teal-50 text-teal-700',
        label: 'Da duyet',
      }
    case 'PUBLISHED':
      return {
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        label: 'Đã xuất bản',
      }
    case 'DRAFT':
      return {
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        label: 'Bản nháp',
      }
    case 'SUBMITTED_FOR_REVIEW':
      return {
        className: 'border-blue-200 bg-blue-50 text-blue-700',
        label: 'Chờ duyệt',
      }
    case 'REVISION_REQUESTED':
      return {
        className: 'border-orange-200 bg-orange-50 text-orange-700',
        label: 'Yêu cầu sửa',
      }
    case 'REJECTED':
      return {
        className: 'border-red-200 bg-red-50 text-red-700',
        label: 'Bị từ chối',
      }
    case 'ARCHIVED':
      return {
        className: 'border-slate-200 bg-slate-50 text-slate-500',
        label: 'Lưu trữ',
      }
    default:
      return {
        className: 'border-slate-200 bg-slate-50 text-slate-600',
        label: status?.trim() || '-',
      }
  }
}

export function getQuestionScopeDisplay(scope?: string | null) {
  switch (scope) {
    case 'QUESTION_BANK':
      return 'Ngân hàng'
    case 'CLASSROOM_ASSESSMENT':
      return 'Đánh giá lớp'
    case 'CENTRAL_EXAM_DRAFT':
      return 'Đề thi nháp'
    case 'CENTRAL_EXAM_PAPER':
      return 'Đề thi chính thức'
    default:
      return scope?.trim() || '-'
  }
}

export function getQuestionVisibilityDisplay(visibility?: string | null) {
  switch (visibility) {
    case 'BANK_VISIBLE':
      return 'Hiển thị trong ngân hàng'
    case 'REVIEWER_ONLY':
      return 'Chỉ reviewer'
    default:
      return visibility?.trim() || '-'
  }
}
