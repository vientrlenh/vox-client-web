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

export async function bulkReviewQuestions(
  payload: BulkUpdateQuestionStatusRequest,
): Promise<BulkUpdateQuestionStatusResponse> {
  const response = await apiClient.patch<ApiResponse<BulkUpdateQuestionStatusResponse>>(
    '/v1/questions/status/bulk',
    payload,
  )

  // BE trả 200 kèm cả hai danh sách kể cả khi mọi câu đều bị từ chối. Vẫn phòng thân
  // để envelope thiếu `data` không biến thành TypeError khi caller đọc `.failed`.
  const data = response.data.data

  return { failed: data?.failed ?? [], updated: data?.updated ?? [] }
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
