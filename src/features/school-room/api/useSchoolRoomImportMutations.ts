import { useMutation } from '@tanstack/react-query'
import {
  type ApiResponse,
  type MutationResult,
  apiClient,
  requireSchoolId,
} from '@/shared/api'
import type { AcceptImportRequest, PreviewImportResponse } from '../types'

type PreviewRoomImportInput = {
  file: File
}

type AcceptRoomImportInput = {
  payload: AcceptImportRequest
  sessionId: string
}

export async function previewRoomImport({
  file,
}: PreviewRoomImportInput): Promise<MutationResult<PreviewImportResponse>> {
  const schoolId = requireSchoolId()
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<ApiResponse<PreviewImportResponse>>(
    `/v1/schools/${schoolId}/rooms/import/preview`,
    formData,
  )

  return response.data
}

export async function acceptRoomImport({
  payload,
  sessionId,
}: AcceptRoomImportInput): Promise<MutationResult<unknown>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<ApiResponse<unknown>>(
    `/v1/schools/${schoolId}/rooms/import/${sessionId}/accept`,
    payload,
  )

  return response.data
}

export function usePreviewRoomImportMutation() {
  return useMutation({
    mutationFn: previewRoomImport,
  })
}

export function useAcceptRoomImportMutation() {
  return useMutation({
    mutationFn: acceptRoomImport,
  })
}
