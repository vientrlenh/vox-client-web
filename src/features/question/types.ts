export type QuestionType =
  | 'READ_ALOUD'
  | 'SHORT_ANSWER'
  | 'LONG_ANSWER'
  | 'OPINION'
  | 'DESCRIPTION'

export type QuestionDto = {
  id: string
  topicId: string
  questionText: string
  audioUrl: string | null
  standardLevelId: string
  standardLevelCode: string | null
  frameworkCode: string | null
  frameworkName: string | null
  questionType: QuestionType
  durationSeconds: number
  isActive: boolean
  createdAt: string
  topic?: QuestionTopicDto | null
}

type QuestionTopicDto = {
  id: string
  bankId: string
  topicName: string
  description: string | null
}

export type QuestionPage = {
  content: QuestionDto[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type CreateQuestionRequest = {
  topicId: string
  questionText: string
  audioUrl: string | null
  standardLevelId: string | null
  questionType: string
  durationSeconds: number
}

export type UpdateQuestionRequest = {
  topicId: string
  questionText: string
  audioUrl: string | null
  standardLevelId: string | null
  questionType: string
  durationSeconds: number
  isActive: boolean
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

export function getActiveStatusDisplay(isActive: boolean) {
  return isActive
    ? {
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        label: 'Hoạt động',
      }
    : {
        className: 'border-slate-200 bg-slate-50 text-slate-500',
        label: 'Ngừng hoạt động',
      }
}
