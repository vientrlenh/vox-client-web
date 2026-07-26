import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { BulkFinalizePreview } from '../types'
import { gradingKeys } from './useGradingQueries'

type ApiResponse<T> = {
  data: T
  message: string
}

export const EXAM_RESULT_BASE = '/v1/exam-results'

/**
 * Xem trước việc chốt sổ: còn bao nhiêu bài chưa chấm / đang chấm dở / đơn phúc khảo
 * chưa xong. Không ghi gì — gọi trước khi mở hộp thoại xác nhận.
 */
export async function fetchFinalizePreview(examId: string) {
  const response = await apiClient.get<ApiResponse<BulkFinalizePreview>>(
    `${EXAM_RESULT_BASE}/finalize/preview`,
    { params: { examId } },
  )
  return response.data.data
}

/**
 * Chốt sổ toàn bộ kết quả của kỳ thi. Còn bài dở thì phải bật
 * `releasePendingWithAiScores` để xác nhận công bố theo điểm AI đang có — mặc định
 * tắt là mặc định an toàn, BE sẽ từ chối.
 */
export async function finalizeExamResults(examId: string, releasePendingWithAiScores: boolean) {
  const response = await apiClient.post<ApiResponse<number>>(`${EXAM_RESULT_BASE}/finalize`, {
    examId,
    releasePendingWithAiScores,
  })
  return response.data.data
}

/**
 * Tải bảng điểm CSV. BE trả UTF-8 có BOM để Excel đọc đúng tiếng Việt, nên giữ
 * nguyên bytes: đọc blob thẳng thay vì để axios parse thành chuỗi.
 */
export async function exportExamScores(input: { examId?: string; scheduleId?: string }) {
  const response = await apiClient.get<Blob>(`${EXAM_RESULT_BASE}/export`, {
    params: { examId: input.examId || undefined, scheduleId: input.scheduleId || undefined },
    responseType: 'blob',
  })
  return response.data
}

/** Kích hoạt tải file trong trình duyệt từ blob CSV. */
export function downloadCsvBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = fileName
  link.href = url
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function useFinalizePreviewQuery(examId: string | null) {
  return useQuery({
    enabled: !!examId,
    queryFn: () => fetchFinalizePreview(examId as string),
    queryKey: gradingKeys.finalizePreview(examId),
    // Con số ở đây quyết định admin có bấm chốt sổ hay không — luôn lấy bản mới
    // khi mở lại hộp thoại thay vì dùng cache đã cũ.
    staleTime: 0,
  })
}

export function useFinalizeExamResultsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      examId,
      releasePendingWithAiScores,
    }: {
      examId: string
      releasePendingWithAiScores: boolean
    }) => finalizeExamResults(examId, releasePendingWithAiScores),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gradingKeys.all }),
  })
}

export function useExportExamScoresMutation() {
  return useMutation({
    mutationFn: (input: { examId?: string; examName?: string; scheduleId?: string }) =>
      exportExamScores(input).then((blob) => {
        downloadCsvBlob(blob, `bang-diem${input.examName ? `-${input.examName}` : ''}.csv`)
      }),
  })
}
