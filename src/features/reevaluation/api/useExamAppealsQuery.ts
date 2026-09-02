import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { AppealPage, AppealStatus, AppealSummary } from '../types'

/**
 * Đơn phúc khảo của MỘT kỳ thi.
 *
 * Query riêng ở BE (`examAppeals`) chứ không dùng `appeals`: cái kia quét toàn trường và
 * chỉ school admin gọi được — nới nó ra là mở dữ liệu phúc khảo của cả trường cho một
 * giáo viên.
 *
 * Phục vụ hai màn khác nhau, cùng một phạm vi dữ liệu:
 * - bài kiểm tra trên lớp: giáo viên tạo bài duyệt đơn và tự nhận chấm;
 * - kỳ thi tập trung: chủ tịch hội đồng CHỈ ĐỌC, để biết đơn nào đang chặn nút công bố
 *   kết quả (quyền duyệt/từ chối vẫn của nhà trường).
 *
 * Trước đây file này nằm trong `features/classTestGrading` và tên field là
 * `classTestAppeals`; `useReevaluationMutations` phải với ngược sang feature kia chỉ để
 * lấy query key.
 */
const EXAM_APPEALS_QUERY = `
  query ExamAppeals(
    $examId: ID!
    $status: AppealStatus
    $keyword: String
    $page: Int
    $size: Int
  ) {
    examAppeals(
      examId: $examId
      status: $status
      keyword: $keyword
      page: $page
      size: $size
    ) {
      content {
        id
        studentName
        className
        examName
        partLabels
        originalScore
        status
        requestedAt
        deadline
        reviewerName
        reviewerStatus
        overdue
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

export type FetchExamAppealsInput = {
  examId: string
  keyword?: string
  page: number
  size: number
  status?: '' | AppealStatus
}

export const examAppealKeys = {
  all: ['exam-appeals'] as const,
  list: (input: FetchExamAppealsInput) => [...examAppealKeys.all, 'list', input] as const,
}

export async function fetchExamAppeals(input: FetchExamAppealsInput) {
  const data = await graphQLRequest<{ examAppeals: AppealPage<AppealSummary> }>(
    EXAM_APPEALS_QUERY,
    {
      examId: input.examId,
      keyword: input.keyword || undefined,
      page: input.page,
      size: input.size,
      status: input.status || undefined,
    },
  )
  return data.examAppeals
}

/** GraphQL 1-based, UI cũng 1-based — gửi thẳng `page`, không quy đổi, như các feature khác. */
export function useExamAppealsQuery(
  examId: string,
  page: number,
  size: number,
  options?: Omit<FetchExamAppealsInput, 'examId' | 'page' | 'size'>,
) {
  const input: FetchExamAppealsInput = { ...options, examId, page, size }
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () => fetchExamAppeals(input),
    queryKey: examAppealKeys.list(input),
  })
}
