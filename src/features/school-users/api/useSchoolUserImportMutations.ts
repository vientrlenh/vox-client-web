import { useMutation } from '@tanstack/react-query'
import {
  type ApiResponse,
  type MutationResult,
  apiClient,
  requireSchoolId,
} from '@/shared/api'
import type {
  AcceptSchoolUserImportRequest,
  AcceptSchoolUserImportResponse,
  PreviewSchoolUserImportResponse,
} from '../types'

type PreviewSchoolUserImportInput = {
  file: File
}

type AcceptSchoolUserImportInput = {
  payload: AcceptSchoolUserImportRequest
  sessionId: string
}

export async function previewSchoolUserImport({
  file,
}: PreviewSchoolUserImportInput): Promise<
  MutationResult<PreviewSchoolUserImportResponse>
> {
  const schoolId = requireSchoolId()
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<
    ApiResponse<PreviewSchoolUserImportResponse>
  >(`/v1/schools/${schoolId}/users/import/preview`, formData)

  return response.data
}

export async function acceptSchoolUserImport({
  payload,
  sessionId,
}: AcceptSchoolUserImportInput): Promise<
  MutationResult<AcceptSchoolUserImportResponse>
> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<
    ApiResponse<AcceptSchoolUserImportResponse>
  >(`/v1/schools/${schoolId}/users/import/${sessionId}/accept`, payload)

  return response.data
}

export function usePreviewSchoolUserImportMutation() {
  return useMutation({
    mutationFn: previewSchoolUserImport,
  })
}

export function useAcceptSchoolUserImportMutation() {
  return useMutation({
    mutationFn: acceptSchoolUserImport,
  })
}
