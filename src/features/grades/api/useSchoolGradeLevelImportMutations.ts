import { useMutation } from '@tanstack/react-query'
import {
  type ApiResponse,
  type MutationResult,
  apiClient,
  requireSchoolId,
} from '@/shared/api'
import type { AcceptImportRequest, AcceptImportResponse, PreviewImportResponse } from '../types'

type PreviewGradeLevelImportInput = {
  file: File
}

type AcceptGradeLevelImportInput = {
  payload: AcceptImportRequest
  sessionId: string
}

export async function previewGradeLevelImport({
  file,
}: PreviewGradeLevelImportInput): Promise<MutationResult<PreviewImportResponse>> {
  const schoolId = requireSchoolId()
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<ApiResponse<PreviewImportResponse>>(
    `/v1/schools/${schoolId}/grade-levels/import/preview`,
    formData,
  )

  return response.data
}

export async function acceptGradeLevelImport({
  payload,
  sessionId,
}: AcceptGradeLevelImportInput): Promise<MutationResult<AcceptImportResponse>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<ApiResponse<AcceptImportResponse>>(
    `/v1/schools/${schoolId}/grade-levels/import/${sessionId}/accept`,
    payload,
  )

  return response.data
}

export function usePreviewGradeLevelImportMutation() {
  return useMutation({
    mutationFn: previewGradeLevelImport,
  })
}

export function useAcceptGradeLevelImportMutation() {
  return useMutation({
    mutationFn: acceptGradeLevelImport,
  })
}
