import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { ExamCandidateResultDto, ExamItemEvaluationDto, StudentExamSummaryDto } from '../types'

type ApiEnvelope<T> = { message: string; data: T }

export const examResultQueryKeys = {
  all: ['exam-results'] as const,
  evaluation: (answerId: string | null) => [...examResultQueryKeys.all, 'evaluation', answerId] as const,
  myExams: () => [...examResultQueryKeys.all, 'my-exams'] as const,
  session: (sessionId: string | null) => [...examResultQueryKeys.all, 'session', sessionId] as const,
}

function getErrorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status
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
  try {
    const response = await apiClient.get<ApiEnvelope<ExamCandidateResultDto>>(`/v1/exam-sessions/${sessionId}/result`)
    return response.data.data
  } catch (error) {
    if (getErrorStatus(error) === 404) {
      return null
    }
    throw error
  }
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
  try {
    const response = await apiClient.get<ApiEnvelope<ExamItemEvaluationDto>>(`/v1/exam-item-responses/${answerId}/evaluation`)
    return response.data.data
  } catch (error) {
    if (getErrorStatus(error) === 404) {
      return null
    }
    throw error
  }
}

export function useExamItemEvaluationQuery(answerId: string | null) {
  return useQuery({
    enabled: Boolean(answerId),
    queryFn: () => fetchExamItemEvaluation(answerId as string),
    queryKey: examResultQueryKeys.evaluation(answerId),
    retry: false,
  })
}
