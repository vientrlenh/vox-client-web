import { useMutation } from '@tanstack/react-query'
import {
  type ApiResponse,
  type MutationResult,
  apiClient,
  requireSchoolId,
} from '@/shared/api'
import type { AcceptImportRequest, AcceptImportResponse, PreviewImportResponse } from '../types'

type PreviewGradeImportInput = {
  file: File
}

type AcceptGradeImportInput = {
  payload: AcceptImportRequest
  sessionId: string
}

export async function previewGradeImport({
  file,
}: PreviewGradeImportInput): Promise<MutationResult<PreviewImportResponse>> {
  const schoolId = requireSchoolId()
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<ApiResponse<PreviewImportResponse>>(
    `/v1/schools/${schoolId}/grades/import/preview`,
    formData,
  )

  return response.data
}

export async function acceptGradeImport({
  payload,
  sessionId,
}: AcceptGradeImportInput): Promise<MutationResult<AcceptImportResponse>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<ApiResponse<AcceptImportResponse>>(
    `/v1/schools/${schoolId}/grades/import/${sessionId}/accept`,
    payload,
  )

  return response.data
}

export function usePreviewGradeImportMutation() {
  return useMutation({
    mutationFn: previewGradeImport,
  })
}

export function useAcceptGradeImportMutation() {
  return useMutation({
    mutationFn: acceptGradeImport,
  })
}
