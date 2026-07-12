import { useQuery } from '@tanstack/react-query'
import { apiClient, graphQLRequest } from '@/shared/api'
import type {
  ExamCandidateResultDto,
  ExamItemEvaluationDto,
  ExamValidityDto,
  StudentExamSummaryDto,
  WordFeedbackDto,
} from '../types'

type ApiEnvelope<T> = { message: string; data: T }

type GraphQlExamResultResponse = {
  examSessionResult: ExamCandidateResultDto | null
}

type GraphQlExamItemEvaluationTurn = Omit<ExamItemEvaluationDto['turns'][number], 'pronunciationOverall' | 'wordFeedback'> & {
  pronunciationOverall?: string | null
  wordFeedback?: string | null
}

type GraphQlExamItemEvaluationResponse = {
  examItemResponseEvaluation: (Omit<ExamItemEvaluationDto, 'signals' | 'suggestions' | 'validity' | 'turns'> & {
    signals?: string | null
    suggestions?: string | null
    validity?: string | null
    turns: GraphQlExamItemEvaluationTurn[]
  }) | null
}

const EXAM_SESSION_RESULT_QUERY = `
  query ExamSessionResult($sessionId: ID!) {
    examSessionResult(sessionId: $sessionId) {
      id
      sessionId
      examId
      paperId
      candidateId
      totalScore
      targetFrameworkBandId
      targetFrameworkBandCode
      targetFrameworkBandLabel
      rubricResultBandId
      rubricResultBandCode
      rubricResultBandName
      status
      sections {
        sectionId
        title
        score
      }
      items {
        paperItemId
        responseId
        sectionId
        itemScore
        weightedScore
      }
    }
  }
`

const EXAM_ITEM_RESPONSE_EVALUATION_QUERY = `
  query ExamItemResponseEvaluation($answerId: ID!) {
    examItemResponseEvaluation(answerId: $answerId) {
      id
      responseId
      paperItemId
      engineType
      gradedByModel
      promptVersion
      rawItemScore
      itemScore
      overallConfidence
      markedInvalid
      requiresRetake
      status
      evaluatedAt
      feedbackSummary
      signals
      validity
      suggestions
      criteria {
        id
        rubricCriterionId
        criterionCode
        criterionName
        rawScore
        finalScore
        rationale
      }
      turns {
        id
        turnOrder
        turnType
        promptText
        audioUrl
        transcript
        wordCount
        durationSeconds
        asrConfidence
        pronunciationOverall
        wordFeedback
      }
    }
  }
`

export const examResultQueryKeys = {
  all: ['exam-results'] as const,
  evaluation: (answerId: string | null) => [...examResultQueryKeys.all, 'evaluation', answerId] as const,
  myExams: () => [...examResultQueryKeys.all, 'my-exams'] as const,
  session: (sessionId: string | null) => [...examResultQueryKeys.all, 'session', sessionId] as const,
}

function parseJsonField<T>(value: string | null | undefined): T | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export async function fetchMyExams() {
  const response = await apiClient.get<ApiEnvelope<StudentExamSummaryDto[]>>('/v1/exams')
  return response.data.data
}

export function useMyExamsQuery() {
  return useQuery({
    queryFn: fetchMyExams,
    queryKey: examResultQueryKeys.myExams(),
  })
}

export async function fetchExamSessionResult(sessionId: string) {
  const data = await graphQLRequest<GraphQlExamResultResponse>(EXAM_SESSION_RESULT_QUERY, { sessionId })
  return data.examSessionResult
}

export function useExamSessionResultQuery(sessionId: string | null) {
  return useQuery({
    enabled: Boolean(sessionId),
    queryFn: () => fetchExamSessionResult(sessionId as string),
    queryKey: examResultQueryKeys.session(sessionId),
    retry: false,
  })
}

export async function fetchExamItemEvaluation(answerId: string) {
  const data = await graphQLRequest<GraphQlExamItemEvaluationResponse>(EXAM_ITEM_RESPONSE_EVALUATION_QUERY, { answerId })
  const evaluation = data.examItemResponseEvaluation
  if (!evaluation) {
    return null
  }

  return {
    ...evaluation,
    signals: parseJsonField(evaluation.signals),
    suggestions: parseJsonField(evaluation.suggestions),
    turns: evaluation.turns.map((turn) => ({
      ...turn,
      pronunciationOverall: parseJsonField(turn.pronunciationOverall),
      wordFeedback: parseJsonField<WordFeedbackDto[]>(turn.wordFeedback),
    })),
    validity: parseJsonField<ExamValidityDto>(evaluation.validity),
  } satisfies ExamItemEvaluationDto
}

export function useExamItemEvaluationQuery(answerId: string | null) {
  return useQuery({
    enabled: Boolean(answerId),
    queryFn: () => fetchExamItemEvaluation(answerId as string),
    queryKey: examResultQueryKeys.evaluation(answerId),
    retry: false,
  })
}
