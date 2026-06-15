import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import type { QuestionPage } from '../types'

export type QuestionListView = 'all' | 'my' | 'review'
export type QuestionQueryFilters = {
  includeArchived?: boolean
  keyword: string
  scope: string
  status: string
  type: string
}

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

  const filterVariableDefinitions =
    view === 'all'
      ? scope === 'admin'
        ? ', $includeArchived: Boolean, $status: String, $keyword: String'
        : ', $scope: String, $status: String, $type: String, $keyword: String'
      : ''

  const filterArguments =
    view === 'all'
      ? scope === 'admin'
        ? ', includeArchived: $includeArchived, status: $status, keyword: $keyword'
        : ', scope: $scope, status: $status, type: $type, keyword: $keyword'
      : ''

  return `
  query Questions($page: Int!, $size: Int!${filterVariableDefinitions}) {
    ${queryName}(page: $page, size: $size${filterArguments}) {
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

  const filterVariableDefinitions =
    scope === 'admin'
      ? ', $includeArchived: Boolean, $scope: String, $status: String, $type: String, $keyword: String'
      : ', $scope: String, $status: String, $type: String, $keyword: String'

  const filterArguments =
    scope === 'admin'
      ? ', includeArchived: $includeArchived, scope: $scope, status: $status, type: $type, keyword: $keyword'
      : ', scope: $scope, status: $status, type: $type, keyword: $keyword'

  return `
  query TopicQuestions($bankId: ID!, $topicId: ID!, $page: Int!, $size: Int!${filterVariableDefinitions}) {
    ${queryName}(bankId: $bankId, topicId: $topicId, page: $page, size: $size${filterArguments}) {
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
  filters: QuestionQueryFilters
  page: number
  scope: QuestionModuleScope
  size: number
  view: QuestionListView
}

type FetchQuestionsByTopicInput = {
  bankId: string
  filters: QuestionQueryFilters
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
    filters: QuestionQueryFilters,
  ) =>
    [...questionQueryKeys.all, 'list', scope, view, page, size, filters] as const,
  questionsByTopic: (
    scope: QuestionModuleScope,
    bankId: string,
    topicId: string,
    page: number,
    size: number,
    filters: QuestionQueryFilters,
  ) =>
    [
      ...questionQueryKeys.all,
      'by-topic',
      scope,
      bankId,
      topicId,
      page,
      size,
      filters,
    ] as const,
}

export async function fetchQuestions({
  filters,
  page,
  scope,
  size,
  view,
}: FetchQuestionsInput) {
  const variables: Record<string, boolean | number | string | undefined> = {
    page,
    size,
  }

  if (view === 'all') {
    if (scope === 'admin') {
      variables.includeArchived = filters.includeArchived
      variables.keyword = filters.keyword || undefined
      variables.status = filters.status || undefined
    } else {
      variables.keyword = filters.keyword || undefined
      variables.scope = filters.scope || undefined
      variables.status = filters.status || undefined
      variables.type = filters.type || undefined
    }
  }

  const data = await graphQLRequest<QuestionsQueryData>(
    getQuestionListQuery(scope, view),
    variables,
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
  filters,
  page,
  scope,
  size,
  topicId,
}: FetchQuestionsByTopicInput) {
  const variables: Record<string, boolean | number | string | undefined> = {
    bankId,
    keyword: filters.keyword || undefined,
    page,
    scope: filters.scope || undefined,
    size,
    status: filters.status || undefined,
    topicId,
    type: filters.type || undefined,
  }

  if (scope === 'admin') {
    variables.includeArchived = filters.includeArchived
  }

  const data = await graphQLRequest<TopicQuestionsQueryData>(
    getTopicQuestionsQuery(scope),
    variables,
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
  filters: QuestionQueryFilters,
) {
  return useQuery({
    enabled: !(scope !== 'teacher' && view === 'my'),
    queryFn: () => fetchQuestions({ filters, page, scope, size, view }),
    queryKey: questionQueryKeys.questions(scope, view, page, size, filters),
  })
}

export function useQuestionsByTopicQuery(
  scope: QuestionModuleScope,
  bankId: string,
  topicId: string,
  page: number,
  size: number,
  filters: QuestionQueryFilters,
) {
  return useQuery({
    enabled: Boolean(bankId && topicId),
    queryFn: () =>
      fetchQuestionsByTopic({ bankId, filters, page, scope, size, topicId }),
    queryKey: questionQueryKeys.questionsByTopic(
      scope,
      bankId,
      topicId,
      page,
      size,
      filters,
    ),
  })
}
