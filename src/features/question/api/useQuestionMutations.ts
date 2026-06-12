import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  CreateQuestionRequest,
  QuestionDto,
  UpdateQuestionRequest,
} from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

export async function createQuestion(payload: CreateQuestionRequest) {
  const response = await apiClient.post<ApiResponse<QuestionDto>>(
    '/v1/questions',
    payload,
  )

  return response.data.message
}

export async function updateQuestion(
  id: string,
  payload: UpdateQuestionRequest,
) {
  const response = await apiClient.put<ApiResponse<QuestionDto>>(
    `/v1/questions/${id}`,
    payload,
  )

  return response.data.message
}

export function useCreateQuestionMutation() {
  return useMutation({
    mutationFn: createQuestion,
  })
}

export function useUpdateQuestionMutation() {
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateQuestionRequest
    }) => updateQuestion(id, payload),
  })
}
