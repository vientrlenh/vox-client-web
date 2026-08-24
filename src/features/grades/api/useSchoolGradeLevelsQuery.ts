import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { SchoolGradeLevel, SchoolGradeLevelPage } from '../types'

// Khối lớp là catalog DÙNG CHUNG toàn hệ thống: không còn schoolId trong query lẫn trong
// field set. Trước đây mỗi trường tự khai một bộ khối riêng nên phải truyền schoolId.
const GRADE_LEVEL_FIELDS = `
  id
  code
  name
  description
  order
  status
  createdAt
  updatedAt
`

const GRADE_LEVELS_QUERY = `
  query GetGradeLevels($page: Int, $size: Int, $search: String, $status: String) {
    gradeLevels(page: $page, size: $size, search: $search, status: $status) {
      content {
        ${GRADE_LEVEL_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

const GRADE_LEVEL_QUERY = `
  query GetGradeLevel($gradeLevelId: ID!) {
    gradeLevel(gradeLevelId: $gradeLevelId) {
      ${GRADE_LEVEL_FIELDS}
    }
  }
`

type GradeLevelsQueryData = {
  gradeLevels: SchoolGradeLevelPage
}

type GradeLevelQueryData = {
  gradeLevel: SchoolGradeLevel
}

export const gradeLevelManagementQueryKeys = {
  all: ['grade-level-management'] as const,
  detail: (id: string) =>
    [...gradeLevelManagementQueryKeys.all, 'detail', id] as const,
  list: (
    page: number,
    size: number,
    search: string,
    status: string,
  ) =>
    [
      ...gradeLevelManagementQueryKeys.all,
      'list',
      page,
      size,
      search,
      status,
    ] as const,
}

export async function fetchSchoolGradeLevels(
  page: number,
  size: number,
  search: string,
  status: string,
) {
  const data = await graphQLRequest<GradeLevelsQueryData>(
    GRADE_LEVELS_QUERY,
    {
      page,
      search: search || undefined,
      size,
      status: status || undefined,
    },
  )

  return data.gradeLevels
}

export async function fetchSchoolGradeLevel(gradeLevelId: string) {
  const data = await graphQLRequest<GradeLevelQueryData>(
    GRADE_LEVEL_QUERY,
    { gradeLevelId },
  )

  return data.gradeLevel
}

export function useSchoolGradeLevelsQuery(
  page: number,
  size: number,
  search = '',
  status = '',
) {
  return useQuery({
    queryFn: () => fetchSchoolGradeLevels(page, size, search, status),
    queryKey: gradeLevelManagementQueryKeys.list(page, size, search, status),
  })
}

export function useSchoolGradeLevelQuery(gradeLevelId: string | null) {
  return useQuery({
    enabled: Boolean(gradeLevelId),
    queryFn: () => fetchSchoolGradeLevel(gradeLevelId!),
    queryKey: gradeLevelManagementQueryKeys.detail(gradeLevelId ?? ''),
  })
}
