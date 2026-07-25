import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { GradingPreview } from '../types'
import { GRADING_BASE, type ItemGradeInput } from './useGradingMutations'
import { gradingKeys } from './useGradingQueries'

type ApiResponse<T> = {
  data: T
  message: string
}

/**
 * Tính thử tổng điểm — là POST nhưng CHỈ ĐỌC, không ghi gì.
 *
 * <p>Tồn tại vì công thức tổng của BE là weighted hai tầng (điểm tiêu chí → điểm
 * phần theo trọng số tiêu chí → điểm phần nhân trọng số câu → tổng theo trọng số
 * section, làm tròn 2 chữ số). FE tự tính sẽ lệch, nên mọi con số điểm hiển thị
 * trên màn chấm đều lấy từ đây thay vì tính tại chỗ.
 */
export async function previewGrading(assignmentId: string, items: ItemGradeInput[]) {
  const response = await apiClient.post<ApiResponse<GradingPreview>>(
    `${GRADING_BASE}/${assignmentId}/grade/preview`,
    { items },
  )
  return response.data.data
}

/**
 * `items` phải là giá trị đã debounce ở phía gọi — nó nằm trong queryKey nên mỗi
 * lần gõ một ký tự sẽ là một request nếu truyền thẳng state của ô nhập.
 *
 * <p>`enabled` tắt khi chưa nhập đủ: BE từ chối bộ điểm thiếu tiêu chí bắt buộc,
 * gọi lúc đó chỉ tạo lỗi đỏ trong khi người dùng vẫn đang gõ dở.
 */
export function useGradingPreviewQuery(
  assignmentId: string | null,
  items: ItemGradeInput[],
  options?: { enabled?: boolean },
) {
  return useQuery({
    enabled: assignmentId != null && items.length > 0 && options?.enabled !== false,
    // Giữ con số cũ trong lúc gọi lại để ô điểm không nhấp nháy về "—" mỗi lần sửa.
    placeholderData: (previous) => previous,
    queryFn: () => previewGrading(assignmentId as string, items),
    queryKey: gradingKeys.preview(assignmentId, items),
    // Điểm chỉ phụ thuộc bộ điểm gửi lên; không cần gọi lại khi quay lại tab.
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: Infinity,
  })
}
