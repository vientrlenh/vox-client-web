import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import { questionTopicQueryKeys } from './useQuestionTopicsQuery'
import type { QuestionTopicDto } from '../types'

const QUESTION_TOPIC_DETAIL_QUERY = `
  query QuestionTopic($id: ID!) {
    questionTopic(id: $id) {
      id
      questionBankId
      code
      name
      description
      status
      createdAt
      updatedAt
      bank {
        id
        code
        name
        status
      }
    }
  }
`

type QuestionTopicDetailQueryData = {
  questionTopic: QuestionTopicDto | null
}

export async function fetchQuestionTopic(id: string) {
  const data = await graphQLRequest<QuestionTopicDetailQueryData>(
    QUESTION_TOPIC_DETAIL_QUERY,
    { id },
  )

  if (!data.questionTopic) {
    return null
  }

  return {
    ...data.questionTopic,
    bankId: data.questionTopic.questionBankId,
    topicName: data.questionTopic.name,
  }
}

export function useQuestionTopicQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchQuestionTopic(id!),
    queryKey: questionTopicQueryKeys.questionTopic(id),
  })
}
