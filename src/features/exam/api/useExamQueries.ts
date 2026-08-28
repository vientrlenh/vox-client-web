import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import { EXAM_LIST_FIELDS, examQueryKeys, fetchExamStatusCounts } from '@/features/examCore/api/queries'
import type { ExamDto, ExamKind, ExamStatus, Paged } from '@/features/examCore/types'

const EXAMS_QUERY = `
  query Exams($kind: ExamKind, $status: ExamStatus, $keyword: String, $page: Int!, $size: Int!) {
    exams(kind: $kind, status: $status, keyword: $keyword, page: $page, size: $size) {
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

type ExamsFilters = {
  keyword?: string
  /**
   * Bỏ trống nghĩa là CENTRALIZED; `null` mới là "cả hai loại".
   *
   * <p>Mặc định phải là CENTRALIZED chứ không phải "tất cả": nơi gọi chính là trang quản lý kỳ thi,
   * ở đó bài kiểm tra trên lớp có trang riêng (query `classTests`) và trộn vào là sai. Nhưng giám
   * sát thi thì cần cả hai - bài trên lớp cũng có ca thi, cũng có giám thị, và mặc định bật giám
   * sát đầy đủ lúc tạo; xem `ActiveExamsList`.
   */
  kind?: ExamKind | null
  page: number
  size: number
  status?: ExamStatus | ''
}

function resolveKind(kind: ExamKind | null | undefined): ExamKind | null {
  return kind === undefined ? 'CENTRALIZED' : kind
}

async function fetchExams(filters: ExamsFilters) {
  const data = await graphQLRequest<{ exams: Paged<ExamDto> }>(EXAMS_QUERY, {
    keyword: filters.keyword?.trim() || null,
    kind: resolveKind(filters.kind),
    page: filters.page,
    size: filters.size,
    status: filters.status || null,
  })
  return data.exams
}

export function useExamsQuery(filters: ExamsFilters) {
  return useQuery({
    queryFn: () => fetchExams(filters),
    // Chuẩn hoá `kind` TRƯỚC khi dựng khoá: nếu để nguyên `filters` thì "bỏ trống kind" và
    // "kind: 'CENTRALIZED'" thành hai ô cache riêng cho cùng một truy vấn.
    queryKey: examQueryKeys.exams({ ...filters, kind: resolveKind(filters.kind) }),
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
