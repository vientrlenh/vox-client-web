import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import { questionBankQueryKeys } from './useQuestionBanksQuery'
import type { QuestionBankDto } from '../types'

const QUESTION_BANK_DETAIL_QUERY = `
  query QuestionBank($id: UUID!) {
    questionBank(id: $id) {
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
      grades {
        id
        questionBankId
        schoolGradeId
        attachedAt
        attachedBy
      }
    }
  }
`

type QuestionBankDetailQueryData = {
  questionBank: QuestionBankDto | null
}

export async function fetchQuestionBank(id: string) {
  const data = await graphQLRequest<QuestionBankDetailQueryData>(
    QUESTION_BANK_DETAIL_QUERY,
    { id },
  )

  if (!data.questionBank) {
    return null
  }

  return {
    ...data.questionBank,
    bankName: data.questionBank.name,
    isActive: data.questionBank.status === 'PUBLISHED',
  }
}

export function useQuestionBankQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchQuestionBank(id!),
    queryKey: questionBankQueryKeys.questionBank(id),
  })
}
