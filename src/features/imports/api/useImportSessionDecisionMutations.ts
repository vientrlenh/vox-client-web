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
  // schoolId của chính phiên import: null nghĩa là phiên thuộc phạm vi hệ thống.
  schoolId?: string | null
  sessionId: string
  type: string
}

type RejectImportSessionInput = {
  sessionId: string
}

export function getAcceptUrl(
  type: string,
  sessionId: string,
  sessionSchoolId?: string | null,
) {
  const normalized = type.trim().toUpperCase()

  // Import danh mục trường và câu hỏi chạy ở phạm vi hệ thống, không gắn schoolId.
  if (normalized === 'SCHOOL_DIRECTORY') {
    return `/v1/schools/directories/import/${sessionId}/accept`
  }

  if (normalized === 'QUESTION') {
    return `/v1/questions/import/${sessionId}/accept`
  }

  // Framework luôn ở phạm vi hệ thống (SYSTEM_ADMIN), không có biến thể theo trường.
  switch (normalized) {
    case 'FRAMEWORK_VERSION':
      return `/v1/frameworks/versions/import/${sessionId}/accept`
    case 'FRAMEWORK_CRITERION':
      return `/v1/frameworks/versions/criteria/import/${sessionId}/accept`
    case 'FRAMEWORK_RESULT_BAND':
      return `/v1/frameworks/versions/result-bands/import/${sessionId}/accept`
    case 'FRAMEWORK_CRITERION_BAND':
      return `/v1/frameworks/versions/criterion-bands/import/${sessionId}/accept`
    default:
      break
  }

  // Rubric và chính sách đánh giá có hai phạm vi. Backend gắn cứng schoolId vào
  // phiên lúc preview, nên chính schoolId của phiên quyết định endpoint —
  // không dùng vai trò người đang đăng nhập.
  if (!sessionSchoolId) {
    switch (normalized) {
      case 'ASSESSMENT_POLICY':
        return `/v1/assessment-policies/system/import/${sessionId}/accept`
      case 'RUBRIC_CRITERION':
        return `/v1/rubrics/system/rubrics/criterions/import/${sessionId}/accept`
      case 'RUBRIC_CRITERION_BAND':
        return `/v1/rubrics/system/rubrics/criterions/bands/import/${sessionId}/accept`
      case 'RUBRIC_RESULT_BAND':
        return `/v1/rubrics/system/versions/result-bands/import/${sessionId}/accept`
      case 'RUBRIC_VERSION':
        return `/v1/rubrics/system/rubrics/versions/import/${sessionId}/accept`
      default:
        break
    }
  }

  const schoolId = sessionSchoolId ?? requireSchoolId()

  switch (normalized) {
    case 'ASSESSMENT_POLICY':
      return `/v1/assessment-policies/schools/${schoolId}/import/${sessionId}/accept`
    case 'RUBRIC_CRITERION':
      return `/v1/rubrics/schools/${schoolId}/rubric-versions/import-sessions/${sessionId}/accept`
    case 'RUBRIC_CRITERION_BAND':
      return `/v1/rubrics/schools/${schoolId}/rubric-criterions/bands/import/${sessionId}/accept`
    case 'RUBRIC_RESULT_BAND':
      return `/v1/rubrics/school/${schoolId}/rubric-versions/result-bands/import/${sessionId}/accept`
    case 'RUBRIC_VERSION':
      return `/v1/rubrics/schools/${schoolId}/rubrics/versions/import/${sessionId}/accept`
    case 'SCHOOL_CLASS':
      return `/v1/schools/${schoolId}/classes/import/${sessionId}/accept`
    case 'SCHOOL_CLASS_USER':
      return `/v1/schools/${schoolId}/classes/users/import/${sessionId}/accept`
    case 'SCHOOL_GRADE':
      return `/v1/schools/${schoolId}/grades/import/${sessionId}/accept`
    case 'SCHOOL_ROOM':
      return `/v1/schools/${schoolId}/rooms/import/${sessionId}/accept`
    case 'USER':
      return `/v1/schools/${schoolId}/users/import/${sessionId}/accept`
    default:
      throw new Error(`Loại import không được hỗ trợ: ${type}`)
  }
}

export async function acceptImportSession({
  confirmedMapping,
  schoolId,
  sessionId,
  type,
}: AcceptImportSessionInput): Promise<
  MutationResult<AcceptImportSessionResponse>
> {
  const response = await apiClient.post<
    ApiResponse<AcceptImportSessionResponse>
  >(getAcceptUrl(type, sessionId, schoolId), { confirmedMapping })

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
