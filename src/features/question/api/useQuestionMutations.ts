import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import type {
  CreateQuestionRequest,
  QuestionDto,
  UpdateQuestionRequest,
} from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

type CreateQuestionMutationResult = {
  id?: string
  questionId?: string
}

type CreateQuestionInput = {
  payload: CreateQuestionRequest
  scope: QuestionModuleScope
}

export async function createQuestion({
  payload,
  scope,
}: CreateQuestionInput) {
  const endpoint =
    scope === 'admin' ? '/v1/questions/system' : '/v1/questions/school'
  const response = await apiClient.post<ApiResponse<CreateQuestionMutationResult>>(
    endpoint,
    payload,
  )

  return {
    message: response.data.message,
    questionId: response.data.data?.questionId ?? response.data.data?.id,
  }
}

export async function updateQuestion(
  id: string,
  payload: UpdateQuestionRequest,
) {
  const response = await apiClient.put<ApiResponse<QuestionDto>>(
    `/v1/questions/${id}/content`,
    payload,
  )

  return response.data.message
}

export async function deleteQuestion(id: string) {
  const response = await apiClient.delete<ApiResponse<QuestionDto>>(
    `/v1/questions/${id}`,
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

export function useDeleteQuestionMutation() {
  return useMutation({
    mutationFn: (id: string) => deleteQuestion(id),
  })
}
