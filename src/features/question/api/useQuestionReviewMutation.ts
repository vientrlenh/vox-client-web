import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  BulkUpdateQuestionStatusRequest,
  BulkUpdateQuestionStatusResponse,
  QuestionDto,
  UpdateQuestionStatusRequest,
} from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

export async function reviewQuestion(
  questionId: string,
  payload: UpdateQuestionStatusRequest,
) {
  const response = await apiClient.patch<ApiResponse<QuestionDto>>(
    `/v1/questions/${questionId}/status`,
    payload,
  )

  return response.data.message
}

export async function bulkReviewQuestions(payload: BulkUpdateQuestionStatusRequest) {
  const response = await apiClient.patch<ApiResponse<BulkUpdateQuestionStatusResponse>>(
    '/v1/questions/status/bulk',
    payload,
  )

  return response.data.data
}

export function useReviewQuestionMutation() {
  return useMutation({
    mutationFn: ({
      payload,
      questionId,
    }: {
      payload: UpdateQuestionStatusRequest
      questionId: string
    }) => reviewQuestion(questionId, payload),
  })
}

export function useBulkReviewQuestionMutation() {
  return useMutation({
    mutationFn: ({ payload }: { payload: BulkUpdateQuestionStatusRequest }) =>
      bulkReviewQuestions(payload),
  })
}
