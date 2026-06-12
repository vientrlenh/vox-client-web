import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import { questionTopicQueryKeys } from './useQuestionTopicsQuery'
import type { QuestionTopicDto } from '../types'

const QUESTION_TOPIC_DETAIL_QUERY = `
  query QuestionTopic($id: ID!) {
    questionTopic(id: $id) {
      id
      bankId
      topicName
      description
    }
  }
`

type QuestionTopicDetailQueryData = {
  questionTopic: QuestionTopicDto
}

export async function fetchQuestionTopic(id: string) {
  const data = await graphQLRequest<QuestionTopicDetailQueryData>(
    QUESTION_TOPIC_DETAIL_QUERY,
    { id },
  )

  return data.questionTopic
}

export function useQuestionTopicQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchQuestionTopic(id!),
    queryKey: questionTopicQueryKeys.questionTopic(id),
  })
}
