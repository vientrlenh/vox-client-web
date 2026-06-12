export type QuestionTopicDto = {
  id: string
  bankId: string
  topicName: string
  description: string | null
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
  topicName: string
  description: string | null
}

export type UpdateQuestionTopicRequest = {
  topicName: string
  description: string | null
}

export function formatNullableText(value?: string | null) {
  return value?.trim() ? value : '-'
}
