export type QuestionTopicDto = {
  id: string
  questionBankId: string
  bankId?: string
  code: string
  name: string
  topicName?: string
  description: string | null
  status: string
  createdAt?: string | null
  updatedAt?: string | null
  bank?: QuestionBankDto | null
}

type QuestionBankDto = {
  id: string
  bankName: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

export type QuestionTopicPage = {
  content: QuestionTopicDto[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type CreateQuestionTopicRequest = {
  bankId: string
  code?: string
  name?: string
  topicName?: string
  description: string | null
}

export type UpdateQuestionTopicRequest = {
  bankId: string
  description: string | null
  topicName: string
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
