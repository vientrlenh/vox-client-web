import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient'

export type SchoolGradingFailure = {
  sessionId: string
  examId: string
  examCode: string
  examName: string
  candidateName: string | null
  className: string | null
  failedAt: string | null
  /** null với phiên bị đánh dấu hỏng qua nhánh DLT — là dữ liệu thật, không phải thiếu. */
  error: string | null
  /** Số lần dịch vụ chấm TỰ thử lại. Không phải định mức của trường — đừng dựng nút từ nó. */
  aiRetryCount: number | null
  schoolRetryLeft: boolean
}

export type SchoolGradingFailurePage = {
  content: SchoolGradingFailure[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  /** Đã áp bộ lọc kỳ thi, chưa áp bộ lọc định mức — hai số này đứng trên chính hai nút lọc. */
  retryLeftCount: number
  noRetryLeftCount: number
}

const SCHOOL_GRADING_FAILURES = `
  query SchoolGradingFailures($examId: ID, $retryLeft: Boolean, $page: Int, $size: Int) {
    schoolGradingFailures(examId: $examId, retryLeft: $retryLeft, page: $page, size: $size) {
      content {
        sessionId
        examId
        examCode
        examName
        candidateName
        className
        failedAt
        error
        aiRetryCount
        schoolRetryLeft
      }
      page
      size
      totalElements
      totalPages
      retryLeftCount
      noRetryLeftCount
    }
  }
`

export type SchoolGradingFailuresFilters = {
  examId: string | null
  page: number
  /** null = không lọc. Ba trạng thái, không phải cờ bật/tắt. */
  retryLeft: boolean | null
  size: number
}

async function fetchSchoolGradingFailures(filters: SchoolGradingFailuresFilters) {
  const data = await graphQLRequest<{ schoolGradingFailures: SchoolGradingFailurePage }>(
    SCHOOL_GRADING_FAILURES,
    {
      examId: filters.examId,
      page: filters.page,
      retryLeft: filters.retryLeft,
      size: filters.size,
    },
  )
  return data.schoolGradingFailures
}

export const schoolGradingFailureKeys = {
  all: ['school-grading-failures'] as const,
  list: (filters: SchoolGradingFailuresFilters) => ['school-grading-failures', filters] as const,
}

export function useSchoolGradingFailuresQuery(filters: SchoolGradingFailuresFilters) {
  return useQuery({
    queryFn: () => fetchSchoolGradingFailures(filters),
    queryKey: schoolGradingFailureKeys.list(filters),
  })
}
