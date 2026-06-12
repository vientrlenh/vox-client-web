import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import type { QuestionPage } from '../types'

export type QuestionListView = 'all' | 'my' | 'review'

const QUESTION_FIELDS = `
  id
  questionTopicId
  code
  instructionText
  questionText
  promptText
  preparationText
  type
  preparationTimeSeconds
  minResponseSeconds
  maxResponseSeconds
  scope
  visibility
  sourceQuestionId
  locked
  status
  createdAt
  updatedAt
  questionTopic {
    id
    questionBankId
    code
    name
  }
`

function getQuestionListQuery(scope: QuestionModuleScope, view: QuestionListView) {
  const queryName =
    scope === 'teacher'
      ? view === 'my'
        ? 'teacherMyQuestions'
        : view === 'review'
          ? 'teacherReviewQueue'
          : 'teacherQuestions'
      : scope === 'school'
        ? view === 'review'
          ? 'schoolReviewQueue'
          : 'schoolQuestions'
        : view === 'review'
          ? 'adminReviewQueue'
          : 'adminQuestions'

  return `
  query Questions($page: Int!, $size: Int!) {
    ${queryName}(page: $page, size: $size) {
      content {
        ${QUESTION_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }`
}

function getTopicQuestionsQuery(scope: QuestionModuleScope) {
  const queryName =
    scope === 'teacher'
      ? 'teacherTopicQuestions'
      : scope === 'school'
        ? 'schoolTopicQuestions'
        : 'adminTopicQuestions'

  return `
  query TopicQuestions($bankId: ID!, $topicId: ID!, $page: Int!, $size: Int!) {
    ${queryName}(bankId: $bankId, topicId: $topicId, page: $page, size: $size) {
      content {
        ${QUESTION_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }`
}

type QuestionsQueryData = {
  teacherMyQuestions?: QuestionPage
  teacherQuestions?: QuestionPage
  teacherReviewQueue?: QuestionPage
  schoolQuestions?: QuestionPage
  schoolReviewQueue?: QuestionPage
  adminQuestions?: QuestionPage
  adminReviewQueue?: QuestionPage
}

type TopicQuestionsQueryData = {
  teacherTopicQuestions?: QuestionPage
  schoolTopicQuestions?: QuestionPage
  adminTopicQuestions?: QuestionPage
}

type FetchQuestionsInput = {
  page: number
  scope: QuestionModuleScope
  size: number
  view: QuestionListView
}

type FetchQuestionsByTopicInput = {
  bankId: string
  page: number
  scope: QuestionModuleScope
  size: number
  topicId: string
}

export const questionQueryKeys = {
  all: ['questions'] as const,
  question: (id: string | null) =>
    [...questionQueryKeys.all, 'detail', id] as const,
  questions: (
    scope: QuestionModuleScope,
    view: QuestionListView,
    page: number,
    size: number,
  ) => [...questionQueryKeys.all, 'list', scope, view, page, size] as const,
  questionsByTopic: (
    scope: QuestionModuleScope,
    bankId: string,
    topicId: string,
    page: number,
    size: number,
  ) =>
    [
      ...questionQueryKeys.all,
      'by-topic',
      scope,
      bankId,
      topicId,
      page,
      size,
    ] as const,
}

export async function fetchQuestions({
  page,
  scope,
  size,
  view,
}: FetchQuestionsInput) {
  const data = await graphQLRequest<QuestionsQueryData>(
    getQuestionListQuery(scope, view),
    {
      page,
      size,
    },
  )

  return (
    data.teacherMyQuestions ??
    data.teacherQuestions ??
    data.teacherReviewQueue ??
    data.schoolQuestions ??
    data.schoolReviewQueue ??
    data.adminQuestions ??
    data.adminReviewQueue ??
    {
      content: [],
      page,
      size,
      totalElements: 0,
      totalPages: 0,
    }
  )
}

export async function fetchQuestionsByTopic({
  bankId,
  page,
  scope,
  size,
  topicId,
}: FetchQuestionsByTopicInput) {
  const data = await graphQLRequest<TopicQuestionsQueryData>(
    getTopicQuestionsQuery(scope),
    {
      bankId,
      page,
      size,
      topicId,
    },
  )

  return (
    data.teacherTopicQuestions ??
    data.schoolTopicQuestions ??
    data.adminTopicQuestions ??
    {
      content: [],
      page,
      size,
      totalElements: 0,
      totalPages: 0,
    }
  )
}

export function useQuestionsQuery(
  scope: QuestionModuleScope,
  view: QuestionListView,
  page: number,
  size: number,
) {
  return useQuery({
    enabled: !(scope !== 'teacher' && view === 'my'),
    queryFn: () => fetchQuestions({ page, scope, size, view }),
    queryKey: questionQueryKeys.questions(scope, view, page, size),
  })
}

export function useQuestionsByTopicQuery(
  scope: QuestionModuleScope,
  bankId: string,
  topicId: string,
  page: number,
  size: number,
) {
  return useQuery({
    enabled: Boolean(bankId && topicId),
    queryFn: () => fetchQuestionsByTopic({ bankId, page, scope, size, topicId }),
    queryKey: questionQueryKeys.questionsByTopic(
      scope,
      bankId,
      topicId,
      page,
      size,
    ),
  })
}
