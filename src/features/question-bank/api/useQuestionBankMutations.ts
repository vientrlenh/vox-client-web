import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  CreateQuestionBankRequest,
  UpdateQuestionBankRequest,
} from '../types'
import type { QuestionBankStatusAction } from '../permissions'

type ApiResponse<T> = {
  data: T
  message: string
}

type CreateQuestionBankInput = {
  payload: CreateQuestionBankRequest
  scope: 'admin' | 'school'
}

type DeleteQuestionBankResponse = {
  archivedInstead: boolean
  deleted: boolean
}

export async function createQuestionBank({
  payload,
  scope,
}: CreateQuestionBankInput) {
  const endpoint =
    scope === 'admin' ? '/v1/question-banks/system' : '/v1/question-banks/school'
  const response = await apiClient.post<ApiResponse<unknown>>(
    endpoint,
    payload,
  )

  return response.data.message
}

export async function updateQuestionBank(
  id: string,
  payload: UpdateQuestionBankRequest,
) {
  const response = await apiClient.put<ApiResponse<unknown>>(
    `/v1/question-banks/${id}`,
    payload,
  )

  return response.data.message
}

export async function deleteQuestionBank(id: string) {
  const response = await apiClient.delete<ApiResponse<DeleteQuestionBankResponse>>(
    `/v1/question-banks/${id}`,
  )

  return {
    ...response.data.data,
    message: response.data.message,
  }
}

export async function reviewQuestionBank(
  id: string,
  payload: { action: QuestionBankStatusAction },
) {
  const response = await apiClient.patch<ApiResponse<unknown>>(
    `/v1/question-banks/${id}/status`,
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

export function useDeleteQuestionBankMutation() {
  return useMutation({
    mutationFn: (id: string) => deleteQuestionBank(id),
  })
}

export function useReviewQuestionBankMutation() {
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: { action: QuestionBankStatusAction }
    }) => reviewQuestionBank(id, payload),
  })
}
