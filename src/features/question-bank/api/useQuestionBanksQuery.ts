import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { QuestionBankPage } from '../types'

export type QuestionModuleScope = 'teacher' | 'school' | 'admin'

const QUESTION_BANK_FIELDS = `
  id
  bankName
  description
  isActive
  createdAt
  updatedAt
  createdBy
  updatedBy
`

function getQuestionBanksQuery(scope: QuestionModuleScope) {
  const queryName =
    scope === 'teacher'
      ? 'teacherQuestionBanks'
      : scope === 'school'
        ? 'schoolQuestionBanks'
        : 'adminQuestionBanks'

  return `
  query QuestionBanks($page: Int!, $size: Int!) {
    ${queryName}(page: $page, size: $size) {
      content {
        ${QUESTION_BANK_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }`
}

type QuestionBanksQueryData = {
  teacherQuestionBanks?: QuestionBankPage
  schoolQuestionBanks?: QuestionBankPage
  adminQuestionBanks?: QuestionBankPage
}

type FetchQuestionBanksInput = {
  page: number
  scope: QuestionModuleScope
  size: number
}

export const questionBankQueryKeys = {
  all: ['question-banks'] as const,
  questionBank: (id: string | null) =>
    [...questionBankQueryKeys.all, 'detail', id] as const,
  questionBanks: (scope: QuestionModuleScope, page: number, size: number) =>
    [...questionBankQueryKeys.all, 'list', scope, page, size] as const,
}

export async function fetchQuestionBanks({
  page,
  scope,
  size,
}: FetchQuestionBanksInput) {
  const data = await graphQLRequest<QuestionBanksQueryData>(
    getQuestionBanksQuery(scope),
    {
      page,
      size,
    },
  )

  return (
    data.teacherQuestionBanks ??
    data.schoolQuestionBanks ??
    data.adminQuestionBanks ??
    {
      content: [],
      page,
      size,
      totalElements: 0,
      totalPages: 0,
    }
  )
}

export function useQuestionBanksQuery(
  scope: QuestionModuleScope,
  page: number,
  size: number,
  enabled = true,
) {
  return useQuery({
    enabled,
    queryFn: () => fetchQuestionBanks({ page, scope, size }),
    queryKey: questionBankQueryKeys.questionBanks(scope, page, size),
  })
}
