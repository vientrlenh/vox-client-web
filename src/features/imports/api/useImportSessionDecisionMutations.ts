import { useMutation } from '@tanstack/react-query'
import {
  type ApiResponse,
  type MutationResult,
  apiClient,
  requireSchoolId,
} from '@/shared/api'
import type { AcceptImportSessionResponse } from '../types'

type AcceptImportSessionInput = {
  confirmedMapping: Record<string, string>
  sessionId: string
  type: string
}

type RejectImportSessionInput = {
  sessionId: string
}

function getAcceptUrl(type: string, sessionId: string) {
  const normalized = type.trim().toUpperCase()

  // Import danh mục trường chạy ở phạm vi hệ thống, không gắn schoolId.
  if (normalized === 'SCHOOL_DIRECTORY') {
    return `/v1/schools/directories/import/${sessionId}/accept`
  }

  const schoolId = requireSchoolId()

  switch (normalized) {
    case 'SCHOOL_CLASS':
      return `/v1/schools/${schoolId}/classes/import/${sessionId}/accept`
    case 'SCHOOL_CLASS_USER':
      return `/v1/schools/${schoolId}/classes/users/import/${sessionId}/accept`
    case 'USER':
      return `/v1/schools/${schoolId}/users/import/${sessionId}/accept`
    default:
      throw new Error(`Loại import không được hỗ trợ: ${type}`)
  }
}

export async function acceptImportSession({
  confirmedMapping,
  sessionId,
  type,
}: AcceptImportSessionInput): Promise<
  MutationResult<AcceptImportSessionResponse>
> {
  const response = await apiClient.post<
    ApiResponse<AcceptImportSessionResponse>
  >(getAcceptUrl(type, sessionId), { confirmedMapping })

  return response.data
}

export async function rejectImportSession({
  sessionId,
}: RejectImportSessionInput) {
  const response = await apiClient.post<ApiResponse<unknown>>(
    `/v1/imports/${sessionId}/reject`,
  )

  return response.data
}

export function useAcceptImportSessionMutation() {
  return useMutation({
    mutationFn: acceptImportSession,
  })
}

export function useRejectImportSessionMutation() {
  return useMutation({
    mutationFn: rejectImportSession,
  })
}
