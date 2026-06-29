import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import type { QuestionTopicPage, QuestionTopicStatus } from '../types'

const QUESTION_TOPIC_FIELDS = `
  id
  questionBankId
  code
  name
  description
  status
  createdAt
  updatedAt
`

const QUESTION_TOPICS_QUERY = `
  query QuestionTopics(
    $questionBankId: UUID
    $status: QuestionTopicStatus
    $keyword: String
    $page: Int!
    $size: Int!
  ) {
    questionTopics(
      questionBankId: $questionBankId
      status: $status
      keyword: $keyword
      page: $page
      size: $size
    ) {
      content {
        ${QUESTION_TOPIC_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type QuestionTopicsQueryData = {
  questionTopics: QuestionTopicPage
}

type FetchQuestionTopicsInput = {
  bankId?: string
  keyword?: string
  page: number
  size: number
  status?: QuestionTopicStatus
}

export const questionTopicQueryKeys = {
  all: ['question-topics'] as const,
  questionTopic: (id: string | null) =>
    [...questionTopicQueryKeys.all, 'detail', id] as const,
  questionTopics: (input: FetchQuestionTopicsInput) =>
    [...questionTopicQueryKeys.all, 'list', input] as const,
}

export async function fetchQuestionTopics(input: FetchQuestionTopicsInput) {
  const data = await graphQLRequest<QuestionTopicsQueryData>(QUESTION_TOPICS_QUERY, {
    keyword: input.keyword || undefined,
    page: input.page,
    questionBankId: input.bankId || undefined,
    size: input.size,
    status: input.status,
  })

  return {
    ...data.questionTopics,
    content: data.questionTopics.content.map((topic) => ({
      ...topic,
      bankId: topic.questionBankId,
      topicName: topic.name,
    })),
  }
}

export function useQuestionTopicsQuery(
  _scope: QuestionModuleScope,
  bankId: string,
  page: number,
  size: number,
  enabled = true,
  options?: {
    keyword?: string
    status?: QuestionTopicStatus
  },
) {
  const input: FetchQuestionTopicsInput = {
    bankId,
    keyword: options?.keyword,
    page,
    size,
    status: options?.status,
  }

  return useQuery({
    enabled: enabled && Boolean(bankId),
    queryFn: () => fetchQuestionTopics(input),
    queryKey: questionTopicQueryKeys.questionTopics(input),
  })
}
