import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  CreateQuestionTopicRequest,
  QuestionTopicDto,
  UpdateQuestionTopicRequest,
} from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

export async function createQuestionTopic(payload: CreateQuestionTopicRequest) {
  const response = await apiClient.post<ApiResponse<QuestionTopicDto>>(
    '/v1/question-topics',
    payload,
  )

  return response.data.message
}

export async function updateQuestionTopic(
  id: string,
  payload: UpdateQuestionTopicRequest,
) {
  const response = await apiClient.put<ApiResponse<QuestionTopicDto>>(
    `/v1/question-topics/${id}`,
    payload,
  )

  return response.data.message
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
