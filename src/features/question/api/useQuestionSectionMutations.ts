import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  UpdateQuestionAssetsRequest,
  UpdateQuestionEvaluationGuideRequest,
} from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

type MutationResult = {
  id?: string
}

export async function createQuestionAssets(
  questionId: string,
  payload: UpdateQuestionAssetsRequest,
) {
  const response = await apiClient.post<ApiResponse<MutationResult>>(
    `/v1/questions/${questionId}/assets`,
    payload,
  )

  return response.data.message
}

export async function updateQuestionAssets(
  questionId: string,
  payload: UpdateQuestionAssetsRequest,
) {
  const response = await apiClient.put<ApiResponse<MutationResult>>(
    `/v1/questions/${questionId}/assets`,
    payload,
  )

  return response.data.message
}

export async function deleteQuestionAssets(questionId: string) {
  const response = await apiClient.delete<ApiResponse<MutationResult>>(
    `/v1/questions/${questionId}/assets`,
  )

  return response.data.message
}

export async function createQuestionEvaluationGuide(
  questionId: string,
  payload: UpdateQuestionEvaluationGuideRequest,
) {
  const response = await apiClient.post<ApiResponse<MutationResult>>(
    `/v1/questions/${questionId}/evaluation-guide`,
    payload,
  )

  return response.data.message
}

export async function updateQuestionEvaluationGuide(
  questionId: string,
  payload: UpdateQuestionEvaluationGuideRequest,
) {
  const response = await apiClient.put<ApiResponse<MutationResult>>(
    `/v1/questions/${questionId}/evaluation-guide`,
    payload,
  )

  return response.data.message
}

export async function deleteQuestionEvaluationGuide(questionId: string) {
  const response = await apiClient.delete<ApiResponse<MutationResult>>(
    `/v1/questions/${questionId}/evaluation-guide`,
  )

  return response.data.message
}

export function useCreateQuestionAssetsMutation() {
  return useMutation({
    mutationFn: ({
      payload,
      questionId,
    }: {
      payload: UpdateQuestionAssetsRequest
      questionId: string
    }) => createQuestionAssets(questionId, payload),
  })
}

export function useUpdateQuestionAssetsMutation() {
  return useMutation({
    mutationFn: ({
      payload,
      questionId,
    }: {
      payload: UpdateQuestionAssetsRequest
      questionId: string
    }) => updateQuestionAssets(questionId, payload),
  })
}

export function useDeleteQuestionAssetsMutation() {
  return useMutation({
    mutationFn: (questionId: string) => deleteQuestionAssets(questionId),
  })
}

export function useCreateQuestionEvaluationGuideMutation() {
  return useMutation({
    mutationFn: ({
      payload,
      questionId,
    }: {
      payload: UpdateQuestionEvaluationGuideRequest
      questionId: string
    }) => createQuestionEvaluationGuide(questionId, payload),
  })
}

export function useUpdateQuestionEvaluationGuideMutation() {
  return useMutation({
    mutationFn: ({
      payload,
      questionId,
    }: {
      payload: UpdateQuestionEvaluationGuideRequest
      questionId: string
    }) => updateQuestionEvaluationGuide(questionId, payload),
  })
}

export function useDeleteQuestionEvaluationGuideMutation() {
  return useMutation({
    mutationFn: (questionId: string) => deleteQuestionEvaluationGuide(questionId),
  })
}
