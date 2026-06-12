import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { QuestionPage } from '../types'

const QUESTION_FIELDS = `
  id
  topicId
  questionText
  audioUrl
  standardLevelId
  standardLevelCode
  frameworkCode
  frameworkName
  questionType
  durationSeconds
  isActive
  createdAt
  topic {
    id
    topicName
  }
`

const QUESTIONS_QUERY = `
  query Questions($page: Int!, $size: Int!) {
    questions(page: $page, size: $size) {
      content {
        ${QUESTION_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

const QUESTIONS_BY_TOPIC_QUERY = `
  query QuestionsByTopic($topicId: ID!, $page: Int!, $size: Int!) {
    questionsByTopic(topicId: $topicId, page: $page, size: $size) {
      content {
        ${QUESTION_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type QuestionsQueryData = {
  questions: QuestionPage
}

type QuestionsByTopicQueryData = {
  questionsByTopic: QuestionPage
}

type FetchQuestionsInput = {
  page: number
  size: number
}

type FetchQuestionsByTopicInput = {
  topicId: string
  page: number
  size: number
}

export const questionQueryKeys = {
  all: ['questions'] as const,
  question: (id: string | null) =>
    [...questionQueryKeys.all, 'detail', id] as const,
  questions: (page: number, size: number) =>
    [...questionQueryKeys.all, 'list', page, size] as const,
  questionsByTopic: (topicId: string, page: number, size: number) =>
    [...questionQueryKeys.all, 'by-topic', topicId, page, size] as const,
}

export async function fetchQuestions({ page, size }: FetchQuestionsInput) {
  const data = await graphQLRequest<QuestionsQueryData>(QUESTIONS_QUERY, {
    page,
    size,
  })

  return data.questions
}

export async function fetchQuestionsByTopic({
  topicId,
  page,
  size,
}: FetchQuestionsByTopicInput) {
  const data = await graphQLRequest<QuestionsByTopicQueryData>(
    QUESTIONS_BY_TOPIC_QUERY,
    {
      topicId,
      page,
      size,
    },
  )

  return data.questionsByTopic
}

export function useQuestionsQuery(page: number, size: number) {
  return useQuery({
    queryFn: () => fetchQuestions({ page, size }),
    queryKey: questionQueryKeys.questions(page, size),
  })
}

export function useQuestionsByTopicQuery(
  topicId: string,
  page: number,
  size: number,
) {
  return useQuery({
    enabled: Boolean(topicId),
    queryFn: () => fetchQuestionsByTopic({ topicId, page, size }),
    queryKey: questionQueryKeys.questionsByTopic(topicId, page, size),
  })
}
