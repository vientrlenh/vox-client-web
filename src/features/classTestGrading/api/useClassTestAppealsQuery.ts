import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { AppealPage, AppealStatus, AppealSummary } from '@/features/reevaluation'

/**
 * Đơn phúc khảo của MỘT bài kiểm tra trên lớp.
 *
 * Query riêng ở BE (`classTestAppeals`) chứ không dùng `appeals`: cái kia quét toàn
 * trường và chỉ school admin gọi được — nới nó ra là mở dữ liệu phúc khảo của cả trường
 * cho một giáo viên.
 */
const CLASS_TEST_APPEALS_QUERY = `
  query ClassTestAppeals(
    $examId: ID!
    $status: AppealStatus
    $keyword: String
    $page: Int
    $size: Int
  ) {
    classTestAppeals(
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

export type FetchClassTestAppealsInput = {
  examId: string
  keyword?: string
  page: number
  size: number
  status?: '' | AppealStatus
}

export const classTestAppealKeys = {
  all: ['class-test-appeals'] as const,
  list: (input: FetchClassTestAppealsInput) => [...classTestAppealKeys.all, 'list', input] as const,
}

export async function fetchClassTestAppeals(input: FetchClassTestAppealsInput) {
  const data = await graphQLRequest<{ classTestAppeals: AppealPage<AppealSummary> }>(
    CLASS_TEST_APPEALS_QUERY,
    {
      examId: input.examId,
      keyword: input.keyword || undefined,
      page: input.page,
      size: input.size,
      status: input.status || undefined,
    },
  )
  return data.classTestAppeals
}

/** Phân trang 0-based ở server, UI 1-based — cùng quy ước với các feature khác. */
export function useClassTestAppealsQuery(
  examId: string,
  page: number,
  size: number,
  options?: Omit<FetchClassTestAppealsInput, 'examId' | 'page' | 'size'>,
) {
  const input: FetchClassTestAppealsInput = { ...options, examId, page, size }
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () => fetchClassTestAppeals(input),
    queryKey: classTestAppealKeys.list(input),
  })
}
