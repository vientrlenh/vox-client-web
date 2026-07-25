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

/** Báo cáo chấm lại cho MỘT phần thi. */
export type ItemReportInput = {
  appealItemId: string
  scores: CriterionScoreInput[]
  note?: string
}

/** Điểm công bố cho MỘT phần thi. */
export type ItemScoreInput = {
  appealItemId: string
  partScore: number
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

/** BE yêu cầu nộp TRỌN GÓI mọi phần thi của đơn trong một request — không có nộp lẻ. */
export async function submitReport(id: string, items: ItemReportInput[]) {
  const response = await apiClient.post<ApiResponse<string>>(
    `${BASE}/${id}/reviewers/me/report`,
    { items },
  )
  return response.data.message
}

/** Tương tự: phải nhập điểm cho đủ mọi phần thi của đơn. */
export async function publishAppeal(
  id: string,
  itemScores: ItemScoreInput[],
  decisionNote?: string,
) {
  const response = await apiClient.post<ApiResponse<string>>(`${BASE}/${id}/publish`, {
    decisionNote,
    itemScores,
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
    mutationFn: ({ id, items }: { id: string; items: ItemReportInput[] }) =>
      submitReport(id, items),
    onSuccess: invalidate,
  })
}

export function usePublishMutation() {
  const invalidate = useInvalidateReevaluation()
  return useMutation({
    mutationFn: ({
      id,
      itemScores,
      decisionNote,
    }: {
      id: string
      itemScores: ItemScoreInput[]
      decisionNote?: string
    }) => publishAppeal(id, itemScores, decisionNote),
    onSuccess: invalidate,
  })
}
