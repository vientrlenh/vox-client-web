import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import { EXAM_LIST_FIELDS, examQueryKeys, fetchExamStatusCounts } from '@/features/examCore/api/queries'
import type { ExamDto, ExamStatus, Paged } from '@/features/examCore/types'

const CLASS_TESTS_QUERY = `
  query ClassTests($status: ExamStatus, $schoolClassId: ID, $keyword: String, $page: Int!, $size: Int!) {
    classTests(status: $status, schoolClassId: $schoolClassId, keyword: $keyword, page: $page, size: $size) {
      content {
        ${EXAM_LIST_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

async function fetchClassTests(filters: {
  keyword?: string
  page: number
  schoolClassId?: string
  size: number
  status?: ExamStatus | ''
}) {
  const data = await graphQLRequest<{ classTests: Paged<ExamDto> }>(CLASS_TESTS_QUERY, {
    keyword: filters.keyword?.trim() || null,
    page: filters.page,
    schoolClassId: filters.schoolClassId || null,
    size: filters.size,
    status: filters.status || null,
  })
  return data.classTests
}

export function useClassTestsQuery(filters: {
  keyword?: string
  page: number
  schoolClassId?: string
  size: number
  status?: ExamStatus | ''
}) {
  return useQuery({
    queryFn: () => fetchClassTests(filters),
    queryKey: examQueryKeys.classTests(filters),
  })
}

export function useClassTestStatsQuery() {
  return useQuery({
    queryFn: () => fetchExamStatusCounts('CLASS_TEST'),
    queryKey: examQueryKeys.classTestStats(),
    select: (data) => ({
      graded: data.resultsPublished,
      open: data.inProgress,
      pendingGrade: data.closed,
      total: data.total,
    }),
  })
}
