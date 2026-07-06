export type QuestionTopicStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type QuestionTopicDto = {
  id: string
  questionBankId: string
  bankId: string
  code: string
  name: string
  topicName: string
  description: string | null
  status: QuestionTopicStatus
  createdAt?: string | null
  updatedAt?: string | null
  bank?: {
    id: string
    code: string
    name: string
    status?: string | null
  } | null
}

export type QuestionTopicPage = {
  content: QuestionTopicDto[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type CreateQuestionTopicRequest = {
  questionBankId?: string
  bankId?: string
  code?: string
  name?: string
  topicName?: string
  description?: string | null
}

export type UpdateQuestionTopicRequest = {
  bankId?: string
  name?: string
  topicName?: string
  description?: string | null
}

export type ReviewQuestionTopicRequest = {
  targetStatus: string
}

export function formatNullableText(value?: string | null) {
  return value?.trim() ? value : '-'
}

export function getQuestionTopicStatusDisplay(status?: string | null) {
  switch (status) {
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
    case 'ARCHIVED':
      return {
        className: 'border-slate-200 bg-slate-50 text-slate-500',
        label: 'Lưu trữ',
      }
    default:
      return {
        className: 'border-slate-200 bg-slate-50 text-slate-600',
        label: String(status ?? '-'),
      }
  }
}
