import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import type { QuestionTopicPage } from '../types'

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

function getQuestionTopicsQuery(scope: QuestionModuleScope) {
  const queryName =
    scope === 'teacher'
      ? 'teacherBankTopics'
      : scope === 'school'
        ? 'schoolBankTopics'
        : 'adminBankTopics'

  return `
  query QuestionTopics($bankId: ID!, $page: Int!, $size: Int!) {
    ${queryName}(bankId: $bankId, page: $page, size: $size) {
      content {
        ${QUESTION_TOPIC_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }`
}

type QuestionTopicsQueryData = {
  teacherBankTopics?: QuestionTopicPage
  schoolBankTopics?: QuestionTopicPage
  adminBankTopics?: QuestionTopicPage
}

type FetchQuestionTopicsInput = {
  bankId: string
  page: number
  scope: QuestionModuleScope
  size: number
}

export const questionTopicQueryKeys = {
  all: ['question-topics'] as const,
  questionTopic: (id: string | null) =>
    [...questionTopicQueryKeys.all, 'detail', id] as const,
  questionTopics: (
    scope: QuestionModuleScope,
    bankId: string,
    page: number,
    size: number,
  ) => [...questionTopicQueryKeys.all, 'list', scope, bankId, page, size] as const,
}

export async function fetchQuestionTopics({
  bankId,
  page,
  scope,
  size,
}: FetchQuestionTopicsInput) {
  const data = await graphQLRequest<QuestionTopicsQueryData>(
    getQuestionTopicsQuery(scope),
    {
      bankId,
      page,
      size,
    },
  )

  return (
    data.teacherBankTopics ??
    data.schoolBankTopics ??
    data.adminBankTopics ??
    {
      content: [],
      page,
      size,
      totalElements: 0,
      totalPages: 0,
    }
  )
}

export function useQuestionTopicsQuery(
  scope: QuestionModuleScope,
  bankId: string,
  page: number,
  size: number,
) {
  return useQuery({
    enabled: Boolean(bankId),
    queryFn: () => fetchQuestionTopics({ bankId, page, scope, size }),
    queryKey: questionTopicQueryKeys.questionTopics(scope, bankId, page, size),
  })
}
