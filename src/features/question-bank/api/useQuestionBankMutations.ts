import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  CreateQuestionBankRequest,
  QuestionBankDto,
  UpdateQuestionBankRequest,
} from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

export async function createQuestionBank(payload: CreateQuestionBankRequest) {
  const response = await apiClient.post<ApiResponse<QuestionBankDto>>(
    '/v1/question-banks',
    payload,
  )

  return response.data.message
}

export async function updateQuestionBank(
  id: string,
  payload: UpdateQuestionBankRequest,
) {
  const response = await apiClient.put<ApiResponse<QuestionBankDto>>(
    `/v1/question-banks/${id}`,
    payload,
  )

  return response.data.message
}

export function useCreateQuestionBankMutation() {
  return useMutation({
    mutationFn: createQuestionBank,
  })
}

export function useUpdateQuestionBankMutation() {
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateQuestionBankRequest
    }) => updateQuestionBank(id, payload),
  })
}
