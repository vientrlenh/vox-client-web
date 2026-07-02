import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  CreateQuestionRequest,
  CreateQuestionCollaboratorRequest,
  UpdateQuestionRequest,
  UpdateQuestionCollaboratorRequest,
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

export async function createQuestionCollaborator(
  questionId: string,
  payload: CreateQuestionCollaboratorRequest,
) {
  const response = await apiClient.post<ApiResponse<unknown>>(
    `/v1/questions/${questionId}/collaborators`,
    payload,
  )

  return response.data.message
}

export async function updateQuestionCollaborator(
  questionId: string,
  collaboratorId: string,
  payload: UpdateQuestionCollaboratorRequest,
) {
  const response = await apiClient.put<ApiResponse<unknown>>(
    `/v1/questions/${questionId}/collaborators/${collaboratorId}`,
    payload,
  )

  return response.data.message
}

export async function deleteQuestionCollaborator(
  questionId: string,
  collaboratorId: string,
) {
  const response = await apiClient.delete<ApiResponse<unknown>>(
    `/v1/questions/${questionId}/collaborators/${collaboratorId}`,
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

export function useCreateQuestionCollaboratorMutation() {
  return useMutation({
    mutationFn: ({
      payload,
      questionId,
    }: {
      payload: CreateQuestionCollaboratorRequest
      questionId: string
    }) => createQuestionCollaborator(questionId, payload),
  })
}

export function useUpdateQuestionCollaboratorMutation() {
  return useMutation({
    mutationFn: ({
      collaboratorId,
      payload,
      questionId,
    }: {
      collaboratorId: string
      payload: UpdateQuestionCollaboratorRequest
      questionId: string
    }) => updateQuestionCollaborator(questionId, collaboratorId, payload),
  })
}

export function useDeleteQuestionCollaboratorMutation() {
  return useMutation({
    mutationFn: ({
      collaboratorId,
      questionId,
    }: {
      collaboratorId: string
      questionId: string
    }) => deleteQuestionCollaborator(questionId, collaboratorId),
  })
}
