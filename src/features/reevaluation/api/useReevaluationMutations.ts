import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { reevaluationKeys } from './useReevaluationQueries'

type ApiResponse<T> = {
  data: T
  message: string
}

const BASE = '/v1/exam-appeals'

export type CriterionScoreInput = {
  criterionId: string
  score: number
  rationale?: string
}

export async function approveAppeal(id: string, deadline: string) {
  const response = await apiClient.post<ApiResponse<string>>(`${BASE}/${id}/approve`, { deadline })
  return response.data.message
}

export async function rejectAppeal(id: string, reason: string) {
  const response = await apiClient.post<ApiResponse<string>>(`${BASE}/${id}/reject`, { reason })
  return response.data.message
}

export async function assignReviewers(id: string, reviewerIds: string[]) {
  const response = await apiClient.post<ApiResponse<string>>(`${BASE}/${id}/reviewers`, {
    reviewerIds,
  })
  return response.data.message
}

export async function removeReviewer(id: string, reviewerId: string) {
  const response = await apiClient.delete<ApiResponse<string>>(
    `${BASE}/${id}/reviewers/${reviewerId}`,
  )
  return response.data.message
}

export async function submitReport(id: string, scores: CriterionScoreInput[], note: string) {
  const response = await apiClient.post<ApiResponse<string>>(
    `${BASE}/${id}/reviewers/me/report`,
    { note, scores },
  )
  return response.data.message
}

export async function publishAppeal(id: string, partScore: number, decisionNote?: string) {
  const response = await apiClient.post<ApiResponse<string>>(`${BASE}/${id}/publish`, {
    decisionNote,
    partScore,
  })
  return response.data.message
}

function useInvalidateReevaluation() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: reevaluationKeys.all })
}

export function useApproveMutation() {
  const invalidate = useInvalidateReevaluation()
  return useMutation({
    mutationFn: ({ id, deadline }: { id: string; deadline: string }) => approveAppeal(id, deadline),
    onSuccess: invalidate,
  })
}

export function useRejectMutation() {
  const invalidate = useInvalidateReevaluation()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectAppeal(id, reason),
    onSuccess: invalidate,
  })
}

export function useAssignMutation() {
  const invalidate = useInvalidateReevaluation()
  return useMutation({
    mutationFn: ({ id, reviewerIds }: { id: string; reviewerIds: string[] }) =>
      assignReviewers(id, reviewerIds),
    onSuccess: invalidate,
  })
}

export function useRemoveReviewerMutation() {
  const invalidate = useInvalidateReevaluation()
  return useMutation({
    mutationFn: ({ id, reviewerId }: { id: string; reviewerId: string }) =>
      removeReviewer(id, reviewerId),
    onSuccess: invalidate,
  })
}

export function useSubmitReportMutation() {
  const invalidate = useInvalidateReevaluation()
  return useMutation({
    mutationFn: ({
      id,
      scores,
      note,
    }: {
      id: string
      scores: CriterionScoreInput[]
      note: string
    }) => submitReport(id, scores, note),
    onSuccess: invalidate,
  })
}

export function usePublishMutation() {
  const invalidate = useInvalidateReevaluation()
  return useMutation({
    mutationFn: ({
      id,
      partScore,
      decisionNote,
    }: {
      id: string
      partScore: number
      decisionNote?: string
    }) => publishAppeal(id, partScore, decisionNote),
    onSuccess: invalidate,
  })
}
