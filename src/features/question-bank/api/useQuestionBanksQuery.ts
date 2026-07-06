import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { QuestionBankOwnerType, QuestionBankPage, QuestionBankStatus } from '../types'

export type QuestionModuleScope = 'teacher' | 'school' | 'admin'

const QUESTION_BANK_FIELDS = `
  id
  languageId
  schoolId
  code
  name
  description
  ownerType
  status
  createdAt
  updatedAt
  createdBy
  updatedBy
`

const QUESTION_BANKS_QUERY = `
  query QuestionBanks(
    $ownerType: QuestionBankOwnerType
    $status: QuestionBankStatus
    $keyword: String
    $page: Int!
    $size: Int!
  ) {
    questionBanks(
      ownerType: $ownerType
      status: $status
      keyword: $keyword
      page: $page
      size: $size
    ) {
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
  keyword?: string
  ownerType?: QuestionBankOwnerType
  page: number
  size: number
  status?: QuestionBankStatus
}

export const questionBankQueryKeys = {
  all: ['question-banks'] as const,
  questionBank: (id: string | null) =>
    [...questionBankQueryKeys.all, 'detail', id] as const,
  questionBanks: (input: FetchQuestionBanksInput) =>
    [...questionBankQueryKeys.all, 'list', input] as const,
}

export async function fetchQuestionBanks(input: FetchQuestionBanksInput) {
  const data = await graphQLRequest<QuestionBanksQueryData>(QUESTION_BANKS_QUERY, {
    keyword: input.keyword || undefined,
    ownerType: input.ownerType,
    page: input.page,
    size: input.size,
    status: input.status,
  })

  return {
    ...data.questionBanks,
    content: data.questionBanks.content.map((bank) => ({
      ...bank,
      bankName: bank.name,
      isActive: bank.status === 'PUBLISHED',
    })),
  }
}

export function useQuestionBanksQuery(
  _scope: QuestionModuleScope,
  page: number,
  size: number,
  enabled = true,
  options?: {
    keyword?: string
    ownerType?: QuestionBankOwnerType
    status?: QuestionBankStatus
  },
) {
  const input: FetchQuestionBanksInput = {
    keyword: options?.keyword,
    ownerType: options?.ownerType,
    page,
    size,
    status: options?.status,
  }

  return useQuery({
    enabled,
    queryFn: () => fetchQuestionBanks(input),
    queryKey: questionBankQueryKeys.questionBanks(input),
  })
}
