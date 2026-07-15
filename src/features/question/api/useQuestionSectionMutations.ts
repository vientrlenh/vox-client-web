import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  CreateQuestionAssetRequest,
  QuestionAssetDto,
  QuestionAssetUploadUrlDto,
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

export async function regenerateQuestionAssetAnalysis(
  questionId: string,
  assetId: string,
) {
  const response = await apiClient.post<ApiResponse<QuestionAssetDto>>(
    `/v1/questions/${questionId}/assets/${assetId}/regenerate-analysis`,
  )

  return response.data.message
}

export async function uploadQuestionAssetFile(
  questionId: string,
  file: File,
) {
  const response = await apiClient.get<ApiResponse<QuestionAssetUploadUrlDto>>(
    `/v1/questions/${questionId}/assets/upload-url`,
    {
      params: {
        contentType: file.type,
      },
    },
  )

  const { uploadUrl, publicUrl } = response.data.data
  let uploadResponse: Response
  try {
    uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    })
  } catch {
    throw new Error('Không thể tải tệp tài nguyên lên vùng lưu trữ. Vui lòng kiểm tra kết nối và thử lại.')
  }

  if (!uploadResponse.ok) {
    throw new Error('Không thể tải tệp tài nguyên lên vùng lưu trữ. Vui lòng thử lại.')
  }

  return publicUrl
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

export function useRegenerateQuestionAssetAnalysisMutation() {
  return useMutation({
    mutationFn: ({
      assetId,
      questionId,
    }: {
      assetId: string
      questionId: string
    }) => regenerateQuestionAssetAnalysis(questionId, assetId),
  })
}

export function useUploadQuestionAssetMutation() {
  return useMutation({
    mutationFn: ({
      file,
      questionId,
    }: {
      file: File
      questionId: string
    }) => uploadQuestionAssetFile(questionId, file),
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
