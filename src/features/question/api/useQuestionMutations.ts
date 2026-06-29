import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  CreateQuestionRequest,
  UpdateQuestionRequest,
  QuestionAssetDto,
  QuestionDto,
  QuestionEvaluationGuideDto,
} from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

type CreateQuestionResponse = {
  question: QuestionDto
  assets: QuestionAssetDto[]
  evaluationGuide: QuestionEvaluationGuideDto | null
}

type UpdateQuestionResponse = {
  question: QuestionDto
  clonedAsNew: boolean
}

type DeleteQuestionResponse = {
  deleted: boolean
  archivedInstead: boolean
}

export async function createQuestion(payload: CreateQuestionRequest) {
  const response = await apiClient.post<ApiResponse<CreateQuestionResponse>>(
    '/v1/questions',
    payload,
  )

  return {
    message: response.data.message,
    questionId: response.data.data.question.id,
  }
}

export async function updateQuestion(
  id: string,
  payload: UpdateQuestionRequest,
) {
  const response = await apiClient.put<ApiResponse<UpdateQuestionResponse>>(
    `/v1/questions/${id}`,
    payload,
  )

  return {
    clonedAsNew: response.data.data.clonedAsNew,
    message: response.data.message,
    questionId: response.data.data.question.id,
  }
}

export async function deleteQuestion(id: string) {
  const response = await apiClient.delete<ApiResponse<DeleteQuestionResponse>>(
    `/v1/questions/${id}`,
  )

  return {
    ...response.data.data,
    message: response.data.message,
  }
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
