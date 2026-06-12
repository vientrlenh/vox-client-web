import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { QuestionTopicPage } from '../types'

const QUESTION_TOPIC_FIELDS = `
  id
  bankId
  topicName
  description
  bank {
    id
    bankName
  }
`

const QUESTION_TOPICS_QUERY = `
  query QuestionTopics($bankId: ID!, $page: Int!, $size: Int!) {
    questionTopics(bankId: $bankId, page: $page, size: $size) {
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
  bankId: string
  page: number
  size: number
}

export const questionTopicQueryKeys = {
  all: ['question-topics'] as const,
  questionTopic: (id: string | null) =>
    [...questionTopicQueryKeys.all, 'detail', id] as const,
  questionTopics: (bankId: string, page: number, size: number) =>
    [...questionTopicQueryKeys.all, 'list', bankId, page, size] as const,
}

export async function fetchQuestionTopics({
  bankId,
  page,
  size,
}: FetchQuestionTopicsInput) {
  const data = await graphQLRequest<QuestionTopicsQueryData>(
    QUESTION_TOPICS_QUERY,
    {
      bankId,
      page,
      size,
    },
  )

  return data.questionTopics
}

export function useQuestionTopicsQuery(
  bankId: string,
  page: number,
  size: number,
) {
  return useQuery({
    enabled: Boolean(bankId),
    queryFn: () => fetchQuestionTopics({ bankId, page, size }),
    queryKey: questionTopicQueryKeys.questionTopics(bankId, page, size),
  })
}
