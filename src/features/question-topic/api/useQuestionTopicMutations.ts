import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  BulkScopeStatusApiResult,
  BulkScopeStatusRequest,
} from '@/shared/api'
import type {
  CreateQuestionTopicRequest,
  UpdateQuestionTopicRequest,
} from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

export async function createQuestionTopic(payload: CreateQuestionTopicRequest) {
  const response = await apiClient.post<ApiResponse<unknown>>(
    '/v1/question-topics',
    payload,
  )

  return response.data.message
}

export async function updateQuestionTopic(
  id: string,
  payload: UpdateQuestionTopicRequest,
) {
  const response = await apiClient.put<ApiResponse<unknown>>(
    `/v1/question-topics/${id}`,
    payload,
  )

  return response.data.message
}

export async function deleteQuestionTopic(id: string) {
  const response = await apiClient.delete<ApiResponse<unknown>>(
    `/v1/question-topics/${id}`,
  )

  return response.data.message
}

export async function reviewQuestionTopic(
  id: string,
  payload: { action: 'PUBLISH' | 'ARCHIVE' },
) {
  const response = await apiClient.patch<ApiResponse<unknown>>(
    `/v1/question-topics/${id}/status`,
    payload,
  )

  return response.data.message
}

/**
 * Đổi trạng thái nhiều chủ đề câu hỏi trong một request.
 *
 * Đây là bước hay vấp nhất khi nạp dữ liệu: import câu hỏi CHỈ nhận chủ đề đã PUBLISHED, mà chủ đề
 * nhập từ Excel luôn vào ở DRAFT — không có đường hàng loạt thì phải mở từng chủ đề một.
 *
 * Backend trả "thành công một phần", xem BulkScopeStatusApiResult.
 */
export async function bulkUpdateQuestionTopicStatus(
  payload: BulkScopeStatusRequest,
) {
  const response = await apiClient.patch<
    ApiResponse<BulkScopeStatusApiResult<unknown>>
  >('/v1/question-topics/bulk/status', payload)

  return response.data.data
}

export function useBulkUpdateQuestionTopicStatusMutation() {
  return useMutation({
    mutationFn: bulkUpdateQuestionTopicStatus,
  })
}

export function useCreateQuestionTopicMutation() {
  return useMutation({
    mutationFn: createQuestionTopic,
  })
}

export function useUpdateQuestionTopicMutation() {
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateQuestionTopicRequest
    }) => updateQuestionTopic(id, payload),
  })
}

export function useDeleteQuestionTopicMutation() {
  return useMutation({
    mutationFn: (id: string) => deleteQuestionTopic(id),
  })
}

export function useReviewQuestionTopicMutation() {
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: { action: 'PUBLISH' | 'ARCHIVE' }
    }) => reviewQuestionTopic(id, payload),
  })
}
