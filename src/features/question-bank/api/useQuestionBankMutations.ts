import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  CreateQuestionBankRequest,
  QuestionBankDto,
  ReviewQuestionBankRequest,
  UpdateQuestionBankRequest,
} from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

type CreateQuestionBankInput = {
  payload: CreateQuestionBankRequest
  scope: 'admin' | 'school'
}

export async function createQuestionBank({
  payload,
  scope,
}: CreateQuestionBankInput) {
  const endpoint =
    scope === 'admin' ? '/v1/question-banks/system' : '/v1/question-banks/school'
  const response = await apiClient.post<ApiResponse<QuestionBankDto>>(
    endpoint,
    payload,
  )

  return response.data.message
}

export async function updateQuestionBank(
  id: string,
  payload: UpdateQuestionBankRequest,
) {
  const response = await apiClient.patch<ApiResponse<QuestionBankDto>>(
    `/v1/question-banks/${id}`,
    payload,
  )

  return response.data.message
}

export async function deleteQuestionBank(id: string) {
  const response = await apiClient.delete<ApiResponse<QuestionBankDto>>(
    `/v1/question-banks/${id}`,
  )

  return response.data.message
}

export async function reviewQuestionBank(
  id: string,
  payload: ReviewQuestionBankRequest,
) {
  const response = await apiClient.patch<ApiResponse<QuestionBankDto>>(
    `/v1/question-banks/${id}/review-actions`,
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
      payload: ReviewQuestionBankRequest
    }) => reviewQuestionBank(id, payload),
  })
}
