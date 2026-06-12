import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import { questionBankQueryKeys } from './useQuestionBanksQuery'
import type { QuestionBankDto } from '../types'

const QUESTION_BANK_DETAIL_QUERY = `
  query QuestionBank($id: ID!) {
    questionBank(id: $id) {
      id
      bankName
      description
      isActive
      createdAt
      updatedAt
      createdBy
      updatedBy
    }
  }
`

type QuestionBankDetailQueryData = {
  questionBank: QuestionBankDto
}

export async function fetchQuestionBank(id: string) {
  const data = await graphQLRequest<QuestionBankDetailQueryData>(
    QUESTION_BANK_DETAIL_QUERY,
    { id },
  )

  return data.questionBank
}

export function useQuestionBankQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchQuestionBank(id!),
    queryKey: questionBankQueryKeys.questionBank(id),
  })
}
