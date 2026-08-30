import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient, graphQLRequest } from '@/shared/api'
import { parseJsonField } from '@/shared/lib/aiEvaluation'
import type {
  ExamCandidateResultDto,
  ExamItemEvaluationDto,
  ExamValidityDto,
  StudentExamKind,
  StudentExamPage,
  StudentExamStatusFilter,
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

type GraphQlAiEvaluationContext = Omit<
  NonNullable<ExamItemEvaluationDto['ai']>, 'signals' | 'suggestions' | 'validity'
> & {
  signals?: string | null
  suggestions?: string | null
  validity?: string | null
}

type GraphQlExamItemEvaluationResponse = {
  examItemResponseEvaluation: (Omit<ExamItemEvaluationDto, 'ai' | 'signals' | 'suggestions' | 'validity' | 'turns'> & {
    ai?: GraphQlAiEvaluationContext | null
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
      scoringScaleMin
      scoringScaleMax
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
        questionText
        asset { type url title altText transcript description durationSeconds }
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
      ai {
        evaluationId
        engineType
        gradedByModel
        promptVersion
        overallConfidence
        requiresHumanReview
        reviewReasonCode
        markedInvalid
        requiresRetake
        evaluatedAt
        feedbackSummary
        signals
        validity
        suggestions
      }
    }
  }
`

export const examResultQueryKeys = {
  all: ['exam-results'] as const,
  evaluation: (answerId: string | null) => [...examResultQueryKeys.all, 'evaluation', answerId] as const,
  myExams: (filters: StudentExamFilters) => [...examResultQueryKeys.all, 'my-exams', filters] as const,
  session: (sessionId: string | null) => [...examResultQueryKeys.all, 'session', sessionId] as const,
}

export type StudentExamFilters = {
  kind: StudentExamKind
  page: number
  size: number
  status?: StudentExamStatusFilter | ''
}

export async function fetchMyExams(filters: StudentExamFilters) {
  // 1-based như mọi đường khác: gửi thẳng `page`, đọc thẳng `response.page`. `GET /v1/exams` từng
  // là ngoại lệ 0-based cuối cùng của dự án; nay BE đã đổi (ViewMyExamsUseCase phân trang qua
  // StudentExamQueryRepository, trừ 1 ở đúng một chỗ) nên không còn gì để quy đổi ở đây.
  const response = await apiClient.get<ApiEnvelope<StudentExamPage>>('/v1/exams', {
    params: {
      kind: filters.kind,
      page: filters.page,
      size: filters.size,
      status: filters.status || undefined,
    },
  })
  return response.data.data
}

export function useMyExamsQuery(filters: StudentExamFilters) {
  return useQuery({
    queryFn: () => fetchMyExams(filters),
    queryKey: examResultQueryKeys.myExams(filters),
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
    ai: evaluation.ai
      ? {
        ...evaluation.ai,
        signals: parseJsonField(evaluation.ai.signals),
        suggestions: parseJsonField(evaluation.ai.suggestions),
        validity: parseJsonField<ExamValidityDto>(evaluation.ai.validity),
      }
      : null,
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

// AI chấm lỗi -> đưa bài vào hàng đợi cho người chấm. REST chứ không GraphQL vì backend chỉ phơi
// endpoint này ở ExamSessionController (không có mutation tương ứng trong exam.graphqls).
//
// Trả về id của ExamCandidateResult vừa tạo ở PENDING_REVIEW. Phiên GIỮ NGUYÊN GRADING_FAILED --
// backend cố ý không đổi trạng thái, nên nút chấm lại bằng AI vẫn dùng được sau đó.
export async function handOffGradingToHuman(sessionId: string) {
  const response = await apiClient.post<ApiEnvelope<string>>(`/v1/exam-sessions/${sessionId}/hand-off-grading`)
  return response.data.data
}

export function useHandOffGradingToHumanMutation() {
  return useMutation({
    mutationFn: (sessionId: string) => handOffGradingToHuman(sessionId),
  })
}

// Bản rework chấm bài đã xoá `reviewFlaggedExamResult` và `releasePendingExamResult`: không còn
// duyệt lẻ từng bài. PENDING_REVIEW ra khỏi hàng chờ bằng một vòng chấm (giáo viên uphold/regrade)
// hoặc bằng chốt sổ hàng loạt ở màn phân công chấm bài.

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
