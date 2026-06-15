import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import { questionQueryKeys } from './useQuestionsQuery'
import type { QuestionDto } from '../types'

const QUESTION_DETAIL_QUERY = `
  query Question($id: ID!) {
    question(id: $id) {
      id
      code
      instructionText
      questionText
      promptText
      preparationText
      type
      preparationTimeSeconds
      minResponseSeconds
      maxResponseSeconds
      scope
      visibility
      sourceQuestionId
      locked
      status
      createdAt
      updatedAt
      createdBy
      updatedBy
      questionTopic {
        id
        questionBankId
        code
        name
      }
      assets {
        id
        questionId
        title
        durationSeconds
        altText
        type
        url
        transcript
        description
        order
      }
      evaluationGuide {
        id
        questionId
        expectedContent
        keyPoints
        acceptableResponses
        offTopicExamples
        scoringHints
        commonMistakes
      }
    }
  }
`

type QuestionDetailQueryData = {
  question: QuestionDto
}

export async function fetchQuestion(id: string) {
  const data = await graphQLRequest<QuestionDetailQueryData>(
    QUESTION_DETAIL_QUERY,
    { id },
  )

  return data.question
}

export function useQuestionQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchQuestion(id!),
    queryKey: questionQueryKeys.question(id),
  })
}
