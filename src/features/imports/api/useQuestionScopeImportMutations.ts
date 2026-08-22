import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'

type ApiResponse<T> = {
  data: T
  message: string
}

export type PreviewImportResponse = {
  expiresAt: string
  fileName: string
  importSessionId: string
  originalHeaders: string[]
  sampleRows: Record<string, string>[]
  suggestedMapping: Record<string, string>
  totalRows: number
}

type AcceptImportInput = {
  confirmedMapping: Record<string, string>
  sessionId: string
}

/**
 * Không nhận schoolId/ownerType: backend suy phạm vi từ vai trò người đăng nhập
 * (PreviewQuestionBankImportFromFileUseCase). Gửi lên cũng bị bỏ qua.
 */
export async function previewQuestionBankImport(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<ApiResponse<PreviewImportResponse>>(
    '/v1/question-banks/import/preview',
    formData,
  )
  return response.data
}

export async function acceptQuestionBankImport({
  confirmedMapping,
  sessionId,
}: AcceptImportInput) {
  const response = await apiClient.post<ApiResponse<unknown>>(
    `/v1/question-banks/import/${sessionId}/accept`,
    { confirmedMapping },
  )
  return response.data
}

export async function previewQuestionTopicImport({
  file,
  questionBankId,
}: {
  file: File
  questionBankId: string
}) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('questionBankId', questionBankId)

  const response = await apiClient.post<ApiResponse<PreviewImportResponse>>(
    '/v1/question-topics/import/preview',
    formData,
  )
  return response.data
}

export async function acceptQuestionTopicImport({
  confirmedMapping,
  sessionId,
}: AcceptImportInput) {
  const response = await apiClient.post<ApiResponse<unknown>>(
    `/v1/question-topics/import/${sessionId}/accept`,
    { confirmedMapping },
  )
  return response.data
}

export function usePreviewQuestionBankImportMutation() {
  return useMutation({ mutationFn: previewQuestionBankImport })
}

export function useAcceptQuestionBankImportMutation() {
  return useMutation({ mutationFn: acceptQuestionBankImport })
}

export function usePreviewQuestionTopicImportMutation() {
  return useMutation({ mutationFn: previewQuestionTopicImport })
}

export function useAcceptQuestionTopicImportMutation() {
  return useMutation({ mutationFn: acceptQuestionTopicImport })
}
