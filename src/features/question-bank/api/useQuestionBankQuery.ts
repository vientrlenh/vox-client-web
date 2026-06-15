import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import {
  type QuestionModuleScope,
  questionBankQueryKeys,
} from './useQuestionBanksQuery'
import type { QuestionBankDto } from '../types'

function getQuestionBankDetailQuery(scope: QuestionModuleScope) {
  const queryName =
    scope === 'teacher'
      ? 'teacherQuestionBank'
      : scope === 'school'
        ? 'schoolQuestionBank'
        : 'adminQuestionBank'

  return `
  query QuestionBank($id: ID!) {
    ${queryName}(id: $id) {
      id
      bankName
      description
      isActive
      createdAt
      updatedAt
      createdBy
      updatedBy
    }
  }`
}

type QuestionBankDetailQueryData = {
  teacherQuestionBank?: QuestionBankDto | null
  schoolQuestionBank?: QuestionBankDto | null
  adminQuestionBank?: QuestionBankDto | null
}

export async function fetchQuestionBank(scope: QuestionModuleScope, id: string) {
  const data = await graphQLRequest<QuestionBankDetailQueryData>(
    getQuestionBankDetailQuery(scope),
    { id },
  )

  return (
    data.teacherQuestionBank ??
    data.schoolQuestionBank ??
    data.adminQuestionBank ??
    null
  )
}

export function useQuestionBankQuery(
  scope: QuestionModuleScope,
  id: string | null,
) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchQuestionBank(scope, id!),
    queryKey: [...questionBankQueryKeys.questionBank(id), scope],
  })
}
