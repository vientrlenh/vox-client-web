import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import { questionTopicQueryKeys } from './useQuestionTopicsQuery'
import type { QuestionTopicDto } from '../types'

function getQuestionTopicDetailQuery(scope: QuestionModuleScope) {
  const queryName =
    scope === 'teacher'
      ? 'teacherQuestionTopic'
      : scope === 'school'
        ? 'schoolQuestionTopic'
        : 'adminQuestionTopic'

  return `
  query QuestionTopic($id: ID!) {
    ${queryName}(id: $id) {
      id
      questionBankId
      code
      name
      description
      status
      createdAt
      updatedAt
    }
  }`
}

type QuestionTopicDetailQueryData = {
  teacherQuestionTopic?: QuestionTopicDto | null
  schoolQuestionTopic?: QuestionTopicDto | null
  adminQuestionTopic?: QuestionTopicDto | null
}

export async function fetchQuestionTopic(scope: QuestionModuleScope, id: string) {
  const data = await graphQLRequest<QuestionTopicDetailQueryData>(
    getQuestionTopicDetailQuery(scope),
    { id },
  )

  return (
    data.teacherQuestionTopic ??
    data.schoolQuestionTopic ??
    data.adminQuestionTopic ??
    null
  )
}

export function useQuestionTopicQuery(
  scope: QuestionModuleScope,
  id: string | null,
) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchQuestionTopic(scope, id!),
    queryKey: [...questionTopicQueryKeys.questionTopic(id), scope],
  })
}
