import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  AcceptQuestionImportRequest,
  PreviewQuestionImportResponse,
} from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

type PreviewQuestionImportInput = {
  file: File
  questionBankId: string
  questionTopicId: string
}

type AcceptQuestionImportInput = {
  payload: AcceptQuestionImportRequest
  sessionId: string
}

export async function previewQuestionImport({
  file,
  questionBankId,
  questionTopicId,
}: PreviewQuestionImportInput) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('questionBankId', questionBankId)
  formData.append('questionTopicId', questionTopicId)

  const response = await apiClient.post<
    ApiResponse<PreviewQuestionImportResponse>
  >('/v1/questions/import/preview', formData)

  return response.data
}

export async function acceptQuestionImport({
  payload,
  sessionId,
}: AcceptQuestionImportInput) {
  const response = await apiClient.post<ApiResponse<unknown>>(
    `/v1/questions/import/${sessionId}/accept`,
    payload,
  )

  return response.data
}

export function usePreviewQuestionImportMutation() {
  return useMutation({
    mutationFn: previewQuestionImport,
  })
}

export function useAcceptQuestionImportMutation() {
  return useMutation({
    mutationFn: acceptQuestionImport,
  })
}
