import { useMutation, useQuery } from '@tanstack/react-query'
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

export type ExamSessionDto = {
  candidateBlocked: boolean
  candidateId: string
  examId: string
  flagged: boolean
  flagReason?: string | null
  id: string
  paperId: string
  startedAt?: string | null
  status: string
  submittedAt?: string | null
}

type GraphQlExamSessionResponse = {
  examSession: ExamSessionDto | null
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
      flagged
      flagReason
      scoreVisible
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

const EXAM_SESSION_STATUS_QUERY = `
  query ExamSessionStatus($id: ID!) {
    examSession(id: $id) {
      id
      examId
      candidateId
      paperId
      startedAt
      submittedAt
      status
      flagged
      flagReason
      candidateBlocked
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
      requiresHumanReview
      reviewReasonCode
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
        minScore
        maxScore
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

export async function fetchExamSessionStatus(sessionId: string) {
  const data = await graphQLRequest<GraphQlExamSessionResponse>(EXAM_SESSION_STATUS_QUERY, { id: sessionId })
  return data.examSession
}

export function useExamSessionStatusQuery(sessionId: string | null) {
  return useQuery({
    enabled: Boolean(sessionId),
    queryFn: () => fetchExamSessionStatus(sessionId as string),
    queryKey: [...examResultQueryKeys.session(sessionId), 'status'],
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

export async function deleteExamSession(sessionId: string) {
  const response = await apiClient.delete<ApiEnvelope<null>>(`/v1/exam-sessions/${sessionId}`)
  return response.data.message
}

export function useDeleteExamSessionMutation() {
  return useMutation({
    mutationFn: (sessionId: string) => deleteExamSession(sessionId),
  })
}

const REVIEW_FLAGGED_EXAM_RESULT_MUTATION = `
  mutation ReviewFlaggedExamResult($candidateResultId: ID!, $decision: ExamCandidateResultStatus!) {
    reviewFlaggedExamResult(candidateResultId: $candidateResultId, decision: $decision)
  }
`

const RELEASE_PENDING_EXAM_RESULT_MUTATION = `
  mutation ReleasePendingExamResult($sessionId: ID!) {
    releasePendingExamResult(sessionId: $sessionId)
  }
`

const RETRY_GRADING_EXAM_SESSION_MUTATION = `
  mutation RetryGradingExamSession($sessionId: ID!) {
    retryGradingExamSession(sessionId: $sessionId)
  }
`

const DECIDE_EXAM_CANDIDATE_RESULT_OUTCOME_MUTATION = `
  mutation DecideExamCandidateResultOutcome($candidateResultId: ID!, $decision: ExamCandidateResultStatus!) {
    decideExamCandidateResultOutcome(candidateResultId: $candidateResultId, decision: $decision)
  }
`

export function useReviewFlaggedExamResultMutation() {
  return useMutation({
    mutationFn: async ({
      candidateResultId,
      decision,
    }: {
      candidateResultId: string
      decision: 'FINAL' | 'INVALID' | 'RETAKE_REQUIRED'
    }) => {
      const data = await graphQLRequest<{ reviewFlaggedExamResult: string }>(REVIEW_FLAGGED_EXAM_RESULT_MUTATION, {
        candidateResultId,
        decision,
      })
      return data.reviewFlaggedExamResult
    },
  })
}

// State diagram: PENDING_REVIEW chỉ có 1 lối ra là RELEASED - giáo viên xác nhận điểm AI ổn.
export function useReleasePendingExamResultMutation() {
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const data = await graphQLRequest<{ releasePendingExamResult: string }>(RELEASE_PENDING_EXAM_RESULT_MUTATION, {
        sessionId,
      })
      return data.releasePendingExamResult
    },
  })
}

// Chỉ áp dụng khi result đang FINAL (kỳ thi đã RESULTS_PUBLISHED nhưng assessmentPolicy không
// có passingScore) - nhà trường tự chốt PASSED/FAILED thủ công.
export function useDecideExamCandidateResultOutcomeMutation() {
  return useMutation({
    mutationFn: async ({
      candidateResultId,
      decision,
    }: {
      candidateResultId: string
      decision: 'PASSED' | 'FAILED'
    }) => {
      const data = await graphQLRequest<{ decideExamCandidateResultOutcome: string }>(
        DECIDE_EXAM_CANDIDATE_RESULT_OUTCOME_MUTATION,
        { candidateResultId, decision },
      )
      return data.decideExamCandidateResultOutcome
    },
  })
}

export function useRetryGradingExamSessionMutation() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const data = await graphQLRequest<{ retryGradingExamSession: string }>(RETRY_GRADING_EXAM_SESSION_MUTATION, {
        sessionId,
      })
      return data.retryGradingExamSession
    },
  })
}

// TEST-ONLY: chấm lại bằng AI từ đầu bất kể trạng thái (kể cả đã GRADED).
const REGRADE_EXAM_SESSION_FOR_TEST_MUTATION = `
  mutation RegradeExamSessionForTest($sessionId: ID!) {
    regradeExamSessionForTest(sessionId: $sessionId)
  }
`

export function useRegradeExamSessionForTestMutation() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const data = await graphQLRequest<{ regradeExamSessionForTest: string }>(REGRADE_EXAM_SESSION_FOR_TEST_MUTATION, {
        sessionId,
      })
      return data.regradeExamSessionForTest
    },
  })
}
