import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  AcceptSchoolClassImportRequest,
  AcceptSchoolClassImportResponse,
  PreviewSchoolClassImportResponse,
} from '../types'
import {
  type ApiResponse,
  type MutationResult,
  requireSchoolId,
} from './schoolClassApiUtils'

type PreviewSchoolClassImportInput = {
  file: File
}

type AcceptSchoolClassImportInput = {
  payload: AcceptSchoolClassImportRequest
  sessionId: string
}

export async function previewSchoolClassImport({
  file,
}: PreviewSchoolClassImportInput): Promise<
  MutationResult<PreviewSchoolClassImportResponse>
> {
  const schoolId = requireSchoolId()
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<
    ApiResponse<PreviewSchoolClassImportResponse>
  >(`/v1/schools/${schoolId}/classes/import/preview`, formData)

  return response.data
}

export async function acceptSchoolClassImport({
  payload,
  sessionId,
}: AcceptSchoolClassImportInput): Promise<
  MutationResult<AcceptSchoolClassImportResponse>
> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<
    ApiResponse<AcceptSchoolClassImportResponse>
  >(`/v1/schools/${schoolId}/classes/import/${sessionId}/accept`, payload)

  return response.data
}

export function usePreviewSchoolClassImportMutation() {
  return useMutation({
    mutationFn: previewSchoolClassImport,
  })
}

export function useAcceptSchoolClassImportMutation() {
  return useMutation({
    mutationFn: acceptSchoolClassImport,
  })
}
