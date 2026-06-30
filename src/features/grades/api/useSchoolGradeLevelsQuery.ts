import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { SchoolGradeLevel, SchoolGradeLevelPage } from '../types'

const SCHOOL_GRADE_LEVEL_FIELDS = `
  id
  schoolId
  code
  name
  description
  order
  status
  createdAt
  updatedAt
`

const SCHOOL_GRADE_LEVELS_QUERY = `
  query GetGradeLevels($schoolId: ID!, $page: Int, $size: Int, $search: String, $status: String) {
    schoolGradeLevels(schoolId: $schoolId, page: $page, size: $size, search: $search, status: $status) {
      content {
        ${SCHOOL_GRADE_LEVEL_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

const SCHOOL_GRADE_LEVEL_QUERY = `
  query GetGradeLevel($schoolId: ID!, $gradeLevelId: ID!) {
    schoolGradeLevel(schoolId: $schoolId, gradeLevelId: $gradeLevelId) {
      ${SCHOOL_GRADE_LEVEL_FIELDS}
    }
  }
`

type SchoolGradeLevelsQueryData = {
  schoolGradeLevels: SchoolGradeLevelPage
}

type SchoolGradeLevelQueryData = {
  schoolGradeLevel: SchoolGradeLevel
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
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<SchoolGradeLevelsQueryData>(
    SCHOOL_GRADE_LEVELS_QUERY,
    {
      page,
      schoolId,
      search: search || undefined,
      size,
      status: status || undefined,
    },
  )

  return data.schoolGradeLevels
}

export async function fetchSchoolGradeLevel(gradeLevelId: string) {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<SchoolGradeLevelQueryData>(
    SCHOOL_GRADE_LEVEL_QUERY,
    { gradeLevelId, schoolId },
  )

  return data.schoolGradeLevel
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
