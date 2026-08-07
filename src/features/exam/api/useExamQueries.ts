import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import { EXAM_LIST_FIELDS, examQueryKeys, fetchExamStatusCounts } from '@/features/examCore/api/queries'
import type { ExamDto, ExamStatus, Paged } from '@/features/examCore/types'

const EXAMS_QUERY = `
  query Exams($kind: ExamKind, $status: ExamStatus, $keyword: String, $page: Int!, $size: Int!) {
    exams(kind: $kind, status: $status, keyword: $keyword, page: $page, size: $size) {
      content {
        ${EXAM_LIST_FIELDS}
        # Chỉ status, đủ cho bước "Xếp lịch" của thanh tiến độ. Chạy qua DataLoader
        # examSchedulesByExamId nên cả trang chỉ tốn thêm một truy vấn gộp, không phải N+1.
        # Không đưa vào EXAM_LIST_FIELDS vì trang bài kiểm tra trên lớp không dùng tới.
        schedules {
          id
          status
        }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

async function fetchExams(filters: { keyword?: string; page: number; size: number; status?: ExamStatus | '' }) {
  const data = await graphQLRequest<{ exams: Paged<ExamDto> }>(EXAMS_QUERY, {
    keyword: filters.keyword?.trim() || null,
    kind: 'CENTRALIZED',
    page: filters.page - 1,
    size: filters.size,
    status: filters.status || null,
  })
  return data.exams
}

export function useExamsQuery(filters: { keyword?: string; page: number; size: number; status?: ExamStatus | '' }) {
  return useQuery({
    queryFn: () => fetchExams(filters),
    queryKey: examQueryKeys.exams(filters),
    select: (data) => ({ ...data, page: data.page + 1 }),
  })
}

export function useExamStatsQuery() {
  return useQuery({
    queryFn: () => fetchExamStatusCounts('CENTRALIZED'),
    queryKey: examQueryKeys.examStats(),
    select: (data) => ({
      inProgress: data.inProgress,
      pending: data.draft + data.scheduled,
      published: data.resultsPublished,
      total: data.total,
    }),
  })
}
