import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient'

/**
 * Một nhóm phiên chấm lỗi cùng nguyên nhân.
 *
 * `signature` là ĐỊNH DANH của nhóm — truyền lại y nguyên vào `useGradingFailureSessionsQuery` để mở
 * nhóm. null là nhóm "không rõ nguyên nhân": phiên bị đánh dấu hỏng qua nhánh DLT không mang thông
 * điệp nào, và mọi phiên hỏng từ trước khi hệ thống bắt đầu lưu lý do cũng nằm ở đây. Đó là một nhóm
 * THẬT, không phải dữ liệu thiếu.
 */
export type GradingFailureGroup = {
  signature: string | null
  /** Thông điệp thô đại diện, để đọc; null ở nhóm không rõ nguyên nhân. */
  sampleError: string | null
  sessionCount: number
  schoolCount: number
  examCount: number
  firstFailedAt: string | null
  lastFailedAt: string | null
  /** Số phiên thuộc kỳ CHƯA công bố điểm, tức thật sự chấm lại được. */
  retryableCount: number
}

export type GradingFailureOverview = {
  sessionCount: number
  causeCount: number
  schoolCount: number
  retryableCount: number
  groups: GradingFailureGroup[]
  /** > 0 nghĩa là chuẩn hóa thông điệp không gom được — cần sửa cách chuẩn hóa, không phải nới trần. */
  groupsTruncated: number
}

export type GradingFailureSession = {
  sessionId: string
  schoolId: string | null
  /** null với kỳ thi cấp hệ thống. */
  schoolName: string | null
  schoolCode: string | null
  examId: string
  examName: string
  candidateName: string | null
  failedAt: string | null
  retryCount: number | null
  error: string | null
  /** Kỳ thi chưa công bố điểm, tức chấm lại được. */
  retryable: boolean
  /** Đã có dòng kết quả trỏ về phiên — bài ĐÃ nằm trong hàng đợi người chấm. */
  handedOff: boolean
}

export type GradingFailureSessionPage = {
  content: GradingFailureSession[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

const GRADING_FAILURE_OVERVIEW_QUERY = `
  query GradingFailureOverview($dateFrom: String, $dateTo: String) {
    gradingFailureOverview(dateFrom: $dateFrom, dateTo: $dateTo) {
      sessionCount
      causeCount
      schoolCount
      retryableCount
      groupsTruncated
      groups {
        signature
        sampleError
        sessionCount
        schoolCount
        examCount
        firstFailedAt
        lastFailedAt
        retryableCount
      }
    }
  }
`

const GRADING_FAILURE_SESSIONS_QUERY = `
  query GradingFailureSessions($dateFrom: String, $dateTo: String, $signature: String, $page: Int, $size: Int) {
    gradingFailureSessions(dateFrom: $dateFrom, dateTo: $dateTo, signature: $signature, page: $page, size: $size) {
      page
      size
      totalElements
      totalPages
      content {
        sessionId
        schoolId
        schoolName
        schoolCode
        examId
        examName
        candidateName
        failedAt
        retryCount
        error
        retryable
        handedOff
      }
    }
  }
`

export const gradingFailureQueryKeys = {
  all: ['grading-failures'] as const,
  overview: (dateFrom: string | null, dateTo: string | null) =>
    [...gradingFailureQueryKeys.all, 'overview', dateFrom, dateTo] as const,
  sessions: (dateFrom: string | null, dateTo: string | null, signature: string | null, page: number) =>
    [...gradingFailureQueryKeys.all, 'sessions', dateFrom, dateTo, signature, page] as const,
}

export function useGradingFailureOverviewQuery(dateFrom: string | null, dateTo: string | null) {
  return useQuery({
    queryFn: async () => {
      const data = await graphQLRequest<{ gradingFailureOverview: GradingFailureOverview }>(
        GRADING_FAILURE_OVERVIEW_QUERY,
        { dateFrom, dateTo },
      )
      return data.gradingFailureOverview
    },
    queryKey: gradingFailureQueryKeys.overview(dateFrom, dateTo),
  })
}

const GRADING_FAILURE_PAGE_SIZE = 10

/**
 * `signature` null KHÔNG phải "bỏ lọc" mà chọn đúng nhóm "không rõ nguyên nhân" — cùng quy ước với
 * BE, nơi phép so là `IS NOT DISTINCT FROM`.
 */
export function useGradingFailureSessionsQuery({
  dateFrom,
  dateTo,
  page,
  signature,
}: {
  dateFrom: string | null
  dateTo: string | null
  page: number
  signature: string | null
}) {
  return useQuery({
    // Giữ trang cũ trong lúc tải trang mới: bảng không nhấp nháy về rỗng mỗi lần bấm sang trang,
    // và chiều cao trang không nhảy.
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const data = await graphQLRequest<{ gradingFailureSessions: GradingFailureSessionPage }>(
        GRADING_FAILURE_SESSIONS_QUERY,
        { dateFrom, dateTo, page, signature, size: GRADING_FAILURE_PAGE_SIZE },
      )
      return data.gradingFailureSessions
    },
    queryKey: gradingFailureQueryKeys.sessions(dateFrom, dateTo, signature, page),
  })
}
