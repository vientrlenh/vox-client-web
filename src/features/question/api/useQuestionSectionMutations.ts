import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  CreateQuestionAssetRequest,
  QuestionAssetDto,
  QuestionEvaluationGuideDto,
  UpdateQuestionAssetRequest,
  UpsertQuestionEvaluationGuideRequest,
} from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

export async function createQuestionAsset(
  questionId: string,
  payload: CreateQuestionAssetRequest,
) {
  const response = await apiClient.post<ApiResponse<QuestionAssetDto>>(
    `/v1/questions/${questionId}/assets`,
    payload,
  )

  return response.data.message
}

export async function updateQuestionAsset(
  questionId: string,
  assetId: string,
  payload: UpdateQuestionAssetRequest,
) {
  const response = await apiClient.put<ApiResponse<QuestionAssetDto>>(
    `/v1/questions/${questionId}/assets/${assetId}`,
    payload,
  )

  return response.data.message
}

export async function deleteQuestionAsset(questionId: string, assetId: string) {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/v1/questions/${questionId}/assets/${assetId}`,
  )

  return response.data.message
}

export async function upsertQuestionEvaluationGuide(
  questionId: string,
  payload: UpsertQuestionEvaluationGuideRequest,
) {
  const response = await apiClient.put<ApiResponse<QuestionEvaluationGuideDto>>(
    `/v1/questions/${questionId}/evaluation-guide`,
    payload,
  )

  return response.data.message
}

export function useCreateQuestionAssetMutation() {
  return useMutation({
    mutationFn: ({
      payload,
      questionId,
    }: {
      payload: CreateQuestionAssetRequest
      questionId: string
    }) => createQuestionAsset(questionId, payload),
  })
}

export function useUpdateQuestionAssetMutation() {
  return useMutation({
    mutationFn: ({
      assetId,
      payload,
      questionId,
    }: {
      assetId: string
      payload: UpdateQuestionAssetRequest
      questionId: string
    }) => updateQuestionAsset(questionId, assetId, payload),
  })
}

export function useDeleteQuestionAssetMutation() {
  return useMutation({
    mutationFn: ({
      assetId,
      questionId,
    }: {
      assetId: string
      questionId: string
    }) => deleteQuestionAsset(questionId, assetId),
  })
}

export function useUpsertQuestionEvaluationGuideMutation() {
  return useMutation({
    mutationFn: ({
      payload,
      questionId,
    }: {
      payload: UpsertQuestionEvaluationGuideRequest
      questionId: string
    }) => upsertQuestionEvaluationGuide(questionId, payload),
  })
}
