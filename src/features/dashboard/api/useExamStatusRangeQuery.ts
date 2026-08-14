import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient'
import type { SchoolAdminDashboard } from './useSchoolAdminDashboardQuery'

export type ExamStatusCounts = SchoolAdminDashboard['examStatusCounts']

const EXAM_STATUS_COUNTS_RANGE_QUERY = `
  query ExamStatusCountsRange($dateFrom: String, $dateTo: String) {
    examStatusCounts(dateFrom: $dateFrom, dateTo: $dateTo) {
      total
      draft
      scheduled
      inProgress
      closed
      resultsPublished
      cancelled
    }
  }
`

/** dateFrom/dateTo là ISO instant (vd. 2026-08-01T00:00:00Z); bỏ trống = không giới hạn mốc đó. */
async function fetchExamStatusCountsInRange(dateFrom: string | null, dateTo: string | null): Promise<ExamStatusCounts> {
  const data = await graphQLRequest<{ examStatusCounts: ExamStatusCounts }>(EXAM_STATUS_COUNTS_RANGE_QUERY, {
    dateFrom,
    dateTo,
  })
  return data.examStatusCounts
}

export const examStatusRangeQueryKeys = {
  all: ['exam-status-counts-range'] as const,
  range: (dateFrom: string | null, dateTo: string | null) => [...examStatusRangeQueryKeys.all, dateFrom, dateTo] as const,
}

export function useExamStatusRangeQuery(dateFrom: string | null, dateTo: string | null) {
  return useQuery({
    queryFn: () => fetchExamStatusCountsInRange(dateFrom, dateTo),
    queryKey: examStatusRangeQueryKeys.range(dateFrom, dateTo),
  })
}
