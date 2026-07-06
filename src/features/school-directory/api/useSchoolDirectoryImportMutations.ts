import { useMutation } from '@tanstack/react-query'
import { type ApiResponse, apiClient } from '@/shared/api'
import type {
  AcceptSchoolDirectoryImportRequest,
  PreviewSchoolDirectoryImportResponse,
} from '../types'

type PreviewSchoolDirectoryImportInput = {
  file: File
}

type AcceptSchoolDirectoryImportInput = {
  payload: AcceptSchoolDirectoryImportRequest
  sessionId: string
}

export async function previewSchoolDirectoryImport({
  file,
}: PreviewSchoolDirectoryImportInput) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<
    ApiResponse<PreviewSchoolDirectoryImportResponse>
  >('/v1/schools/directories/import/preview', formData)

  return response.data
}

export async function acceptSchoolDirectoryImport({
  payload,
  sessionId,
}: AcceptSchoolDirectoryImportInput) {
  // Import danh mục chạy bất đồng bộ — response chỉ trả về message xác nhận đã nhận job.
  const response = await apiClient.post<{ message: string }>(
    `/v1/schools/directories/import/${sessionId}/accept`,
    payload,
  )

  return response.data
}

export function usePreviewSchoolDirectoryImportMutation() {
  return useMutation({
    mutationFn: previewSchoolDirectoryImport,
  })
}

export function useAcceptSchoolDirectoryImportMutation() {
  return useMutation({
    mutationFn: acceptSchoolDirectoryImport,
  })
}
