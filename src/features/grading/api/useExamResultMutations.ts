import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { ExamKind } from '@/features/examCore/types'
import { downloadBlob, extractFileName } from '@/shared/lib/downloadFile'
import type {
  BulkFinalizePreview,
  ExamCandidateResultStatus,
  GradingAssignmentStatus,
  GradingRoundType,
} from '../types'
import { gradingKeys } from './useGradingQueries'

type ApiResponse<T> = {
  data: T
  message: string
}

export const EXAM_RESULT_BASE = '/v1/exam-results'

/**
 * Bộ lọc gửi kèm khi xuất bảng điểm — soi gương `FetchGradingAssignmentsInput`, bỏ
 * `page`/`size` (xuất là xuất hết) và thêm `examName` để đặt tên file phía client.
 *
 * Phải cùng bộ trường với bảng trên màn: người dùng lọc xong rồi bấm xuất thì file phải là
 * đúng cái họ đang nhìn, không phải toàn bộ kỳ thi.
 */
export type ExportExamScoresInput = {
  assignmentStatus?: '' | GradingAssignmentStatus
  examId?: string
  examName?: string
  hasOpenAppeal?: boolean
  /** Bỏ trống là BE hiểu `CENTRALIZED`. Màn bài kiểm tra trên lớp phải truyền tường minh. */
  kind?: ExamKind
  keyword?: string
  overdueOnly?: boolean
  resultStatus?: '' | ExamCandidateResultStatus
  roundType?: '' | GradingRoundType
  scheduleId?: string
  teacherId?: string
  unassignedOnly?: boolean
}

/**
 * Ba cờ boolean chỉ gửi khi BẬT: gửi `false` là một bộ lọc khác hẳn với "không lọc" ở
 * `hasOpenAppeal` (false = chỉ bài KHÔNG có đơn đang mở). Cùng luật với
 * `fetchGradingAssignments`, để file xuất ra và bảng trên màn không lệch nhau.
 */
function toExportParams(input: ExportExamScoresInput) {
  return {
    assignmentStatus: input.assignmentStatus || undefined,
    examId: input.examId || undefined,
    hasOpenAppeal: input.hasOpenAppeal ? true : undefined,
    keyword: input.keyword?.trim() || undefined,
    kind: input.kind || undefined,
    overdueOnly: input.overdueOnly ? true : undefined,
    resultStatus: input.resultStatus || undefined,
    roundType: input.roundType || undefined,
    scheduleId: input.scheduleId || undefined,
    teacherId: input.teacherId || undefined,
    unassignedOnly: input.unassignedOnly ? true : undefined,
  }
}

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
 * `responseType: 'blob'` áp cho MỌI response, kể cả response lỗi — nên khi BE trả JSON
 * lỗi thì `error.response.data` là một Blob và `toApiError` không đọc được `message`
 * trong đó, người dùng chỉ thấy "Request failed with status code 400" của axios.
 * Đọc blob ra text rồi vá lại `response.data` để lớp trên xử lý như mọi lỗi khác.
 */
async function rethrowWithParsedBlobError(error: unknown): Promise<never> {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as unknown
      ;(error as { response: { data: unknown } }).response.data = parsed
    } catch {
      // Body không phải JSON (BE lỗi 5xx trả HTML chẳng hạn) — để nguyên cho
      // `toApiError` rơi về message mặc định của axios.
    }
  }
  throw error
}

/**
 * Tải bảng điểm CSV. BE trả UTF-8 có BOM để Excel đọc đúng tiếng Việt, nên giữ
 * nguyên bytes: đọc blob thẳng thay vì để axios parse thành chuỗi.
 */
export async function exportExamScores(input: ExportExamScoresInput) {
  try {
    const response = await apiClient.get<Blob>(`${EXAM_RESULT_BASE}/export`, {
      params: toExportParams(input),
      responseType: 'blob',
    })
    return response.data
  } catch (error) {
    return rethrowWithParsedBlobError(error)
  }
}

/**
 * Tải bảng điểm Excel (.xlsx) và lưu thẳng về máy.
 *
 * Khác bản CSV, hàm này tự tải luôn vì tên file do BE đặt (có dấu thời gian, có loại kỳ thi)
 * và chỉ đọc được từ header `Content-Disposition` của chính response này.
 */
export async function exportExamScoresExcel(input: ExportExamScoresInput) {
  try {
    const response = await apiClient.get<Blob>(`${EXAM_RESULT_BASE}/export/excel`, {
      params: toExportParams(input),
      responseType: 'blob',
    })
    downloadBlob(
      response.data,
      extractFileName(response.headers['content-disposition'], 'bang-diem.xlsx'),
    )
  } catch (error) {
    return rethrowWithParsedBlobError(error)
  }
}

/** @deprecated Dùng `downloadBlob` từ `@/shared/lib/downloadFile`. */
export const downloadCsvBlob = downloadBlob

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
    mutationFn: (input: ExportExamScoresInput) =>
      exportExamScores(input).then((blob) => {
        downloadBlob(blob, `bang-diem${input.examName ? `-${input.examName}` : ''}.csv`)
      }),
  })
}

export function useExportExamScoresExcelMutation() {
  return useMutation({ mutationFn: exportExamScoresExcel })
}
