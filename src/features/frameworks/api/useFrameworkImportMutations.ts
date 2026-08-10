import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { ApiResponse } from '@/shared/api'
import type {
  AcceptFrameworkImportRequest,
  AcceptFrameworkImportResponse,
  PreviewFrameworkImportResponse,
} from '../types'

type AcceptInput = {
  payload: AcceptFrameworkImportRequest
  sessionId: string
}

// 4 luồng import (version/criterion/result-band/criterion-band) dùng chung
// một shape request/response, chỉ khác URL — nên gói chung 1 cặp factory
// thay vì lặp lại 4 hook gần như giống hệt nhau.
function usePreviewFrameworkImportMutation(buildUrl: () => string | null) {
  return useMutation({
    mutationFn: async (file: File) => {
      const url = buildUrl()
      if (!url) {
        throw new Error('Thiếu thông tin để import.')
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await apiClient.post<
        ApiResponse<PreviewFrameworkImportResponse>
      >(url, formData)

      return response.data
    },
  })
}

function useAcceptFrameworkImportMutation(buildUrl: (sessionId: string) => string) {
  return useMutation({
    mutationFn: async ({ payload, sessionId }: AcceptInput) => {
      const response = await apiClient.post<
        ApiResponse<AcceptFrameworkImportResponse>
      >(buildUrl(sessionId), payload)

      return response.data
    },
  })
}

export function usePreviewFrameworkVersionImportMutation(frameworkId?: string) {
  return usePreviewFrameworkImportMutation(() =>
    frameworkId ? `/v1/frameworks/${frameworkId}/versions/import/preview` : null,
  )
}

export function useAcceptFrameworkVersionImportMutation() {
  return useAcceptFrameworkImportMutation(
    (sessionId) => `/v1/frameworks/versions/import/${sessionId}/accept`,
  )
}

export function usePreviewFrameworkCriterionImportMutation(versionId?: string) {
  return usePreviewFrameworkImportMutation(() =>
    versionId ? `/v1/frameworks/versions/${versionId}/criteria/import/preview` : null,
  )
}

export function useAcceptFrameworkCriterionImportMutation() {
  return useAcceptFrameworkImportMutation(
    (sessionId) => `/v1/frameworks/versions/criteria/import/${sessionId}/accept`,
  )
}

export function usePreviewFrameworkResultBandImportMutation(versionId?: string) {
  return usePreviewFrameworkImportMutation(() =>
    versionId ? `/v1/frameworks/versions/${versionId}/result-bands/import/preview` : null,
  )
}

export function useAcceptFrameworkResultBandImportMutation() {
  return useAcceptFrameworkImportMutation(
    (sessionId) => `/v1/frameworks/versions/result-bands/import/${sessionId}/accept`,
  )
}

export function usePreviewFrameworkCriterionBandImportMutation(versionId?: string) {
  return usePreviewFrameworkImportMutation(() =>
    versionId ? `/v1/frameworks/versions/${versionId}/criterion-bands/import/preview` : null,
  )
}

export function useAcceptFrameworkCriterionBandImportMutation() {
  return useAcceptFrameworkImportMutation(
    (sessionId) => `/v1/frameworks/versions/criterion-bands/import/${sessionId}/accept`,
  )
}
