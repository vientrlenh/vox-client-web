import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import type {
  QuestionPage,
  QuestionScope,
  QuestionSharing,
  QuestionStatus,
  QuestionType,
} from '../types'

export type QuestionListView = 'all' | 'my' | 'review'

export type QuestionQueryFilters = {
  keyword: string
  questionBankId?: string
  questionTopicId?: string
  scope?: '' | QuestionScope
  sharing?: '' | QuestionSharing
  status?: '' | QuestionStatus
  topicName?: string
  type?: '' | QuestionType
}

const QUESTION_FIELDS = `
  id
  questionBankId
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
  sharing
  sourceQuestionId
  locked
  status
  confidentiality
  securePoolId
  createdAt
  updatedAt
  createdBy
  updatedBy
  topic {
    id
    questionBankId
    code
    name
    description
    status
  }
  bank {
    id
    code
    name
    description
    ownerType
    status
  }
  collaborators {
    id
    userId
    questionId
    permission
    assignedAt
  }
`

const QUESTIONS_QUERY = `
  query Questions(
    $questionBankId: UUID
    $questionTopicId: UUID
    $topicName: String
    $status: QuestionStatus
    $type: QuestionType
    $sharing: QuestionSharing
    $scope: QuestionScope
    $keyword: String
    $page: Int!
    $size: Int!
  ) {
    questions(
      questionBankId: $questionBankId
      questionTopicId: $questionTopicId
      topicName: $topicName
      status: $status
      type: $type
      sharing: $sharing
      scope: $scope
      keyword: $keyword
      page: $page
      size: $size
    ) {
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

type FetchQuestionsInput = {
  filters: QuestionQueryFilters
  page: number
  size: number
}

export const questionQueryKeys = {
  all: ['questions'] as const,
  question: (id: string | null) =>
    [...questionQueryKeys.all, 'detail', id] as const,
  questions: (
    view: QuestionListView,
    page: number,
    size: number,
    filters: QuestionQueryFilters,
  ) => [...questionQueryKeys.all, 'list', view, page, size, filters] as const,
}

function resolveScopeForView(
  scope: QuestionModuleScope,
  view: QuestionListView,
  filters: QuestionQueryFilters,
) {
  if (view === 'review') {
    return 'COLLABORATING'
  }

  if (view === 'my') {
    return (filters.scope || 'MINE') as QuestionScope
  }

  if (scope === 'teacher') {
    return (filters.scope || 'ALL') as QuestionScope
  }

  return undefined
}

export async function fetchQuestions({
  filters,
  page,
  size,
}: FetchQuestionsInput) {
  const data = await graphQLRequest<QuestionsQueryData>(QUESTIONS_QUERY, {
    keyword: filters.keyword || undefined,
    page,
    questionBankId: filters.questionBankId || undefined,
    questionTopicId: filters.questionTopicId || undefined,
    scope: filters.scope || undefined,
    sharing: filters.sharing || undefined,
    size,
    status: filters.status || undefined,
    topicName: filters.topicName || undefined,
    type: filters.type || undefined,
  })

  return data.questions
}

export function useQuestionsQuery(
  scope: QuestionModuleScope,
  view: QuestionListView,
  page: number,
  size: number,
  filters: QuestionQueryFilters,
) {
  const resolvedFilters: QuestionQueryFilters = {
    ...filters,
    scope: resolveScopeForView(scope, view, filters),
  }

  return useQuery({
    queryFn: () =>
      fetchQuestions({
        filters: resolvedFilters,
        page: page - 1,
        size,
      }),
    queryKey: questionQueryKeys.questions(view, page, size, resolvedFilters),
    select: (data) => ({
      ...data,
      page: data.page + 1,
    }),
  })
}
