import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { QuestionBankPage } from '../types'

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

const QUESTION_BANKS_QUERY = `
  query QuestionBanks($page: Int!, $size: Int!) {
    questionBanks(page: $page, size: $size) {
      content {
        ${QUESTION_BANK_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type QuestionBanksQueryData = {
  questionBanks: QuestionBankPage
}

type FetchQuestionBanksInput = {
  page: number
  size: number
}

export const questionBankQueryKeys = {
  all: ['question-banks'] as const,
  questionBank: (id: string | null) =>
    [...questionBankQueryKeys.all, 'detail', id] as const,
  questionBanks: (page: number, size: number) =>
    [...questionBankQueryKeys.all, 'list', page, size] as const,
}

export async function fetchQuestionBanks({
  page,
  size,
}: FetchQuestionBanksInput) {
  const data = await graphQLRequest<QuestionBanksQueryData>(
    QUESTION_BANKS_QUERY,
    {
      page,
      size,
    },
  )

  return data.questionBanks
}

export function useQuestionBanksQuery(page: number, size: number) {
  return useQuery({
    queryFn: () => fetchQuestionBanks({ page, size }),
    queryKey: questionBankQueryKeys.questionBanks(page, size),
  })
}
