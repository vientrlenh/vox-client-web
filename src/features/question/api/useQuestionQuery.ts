import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import { questionQueryKeys } from './useQuestionsQuery'
import type { QuestionDto } from '../types'

const QUESTION_DETAIL_QUERY = `
  query Question($id: UUID!) {
    question(id: $id) {
      id
      questionBankId
      questionTopicId
      code
      instructionText
      questionText
      promptText
      preparationText
      type
      preparationTimeSeconds
      minResponseSeconds
      maxResponseSeconds
      sharing
      sourceQuestionId
      locked
      status
      confidentiality
      securePoolId
      createdAt
      updatedAt
      createdBy
      updatedBy
      topic {
        id
        questionBankId
        code
        name
        description
        status
      }
      bank {
        id
        code
        name
        description
        ownerType
        status
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
      collaborators {
        id
        userId
        questionId
        permission
        assignedAt
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
