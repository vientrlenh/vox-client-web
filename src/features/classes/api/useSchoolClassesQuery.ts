import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { ClassFilters, PageResult, SchoolClass } from '../types'

const SCHOOL_CLASS_FIELDS = `
  id
  schoolId
  languageId
  schoolGradeId
  code
  name
  description
  status
  createdAt
  updatedAt
`

const SCHOOL_CLASSES_QUERY = `
  query SchoolClasses(
    $page: Int!
    $size: Int!
    $search: String
    $status: String
    $languageId: ID
    $schoolGradeId: ID
  ) {
    schoolClasses(
      page: $page
      size: $size
      search: $search
      status: $status
      languageId: $languageId
      schoolGradeId: $schoolGradeId
    ) {
      content {
        ${SCHOOL_CLASS_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type SchoolClassesQueryData = {
  schoolClasses: PageResult<SchoolClass>
}

type FetchSchoolClassesInput = {
  filters: ClassFilters
  page: number
  size: number
}

export const classManagementQueryKeys = {
  all: ['class-management'] as const,
  classDetail: (id: string | null) =>
    [...classManagementQueryKeys.all, 'detail', id] as const,
  classUsers: (classId: string | null, page: number, size: number) =>
    [...classManagementQueryKeys.all, 'users', classId, page, size] as const,
  classes: (page: number, size: number, filters: ClassFilters) =>
    [
      ...classManagementQueryKeys.all,
      'list',
      page,
      size,
      filters.search,
      filters.status,
      filters.languageId,
      filters.schoolGradeId,
    ] as const,
}

export async function fetchSchoolClasses({
  filters,
  page,
  size,
}: FetchSchoolClassesInput) {
  const data = await graphQLRequest<SchoolClassesQueryData>(
    SCHOOL_CLASSES_QUERY,
    {
      languageId: filters.languageId.trim() || null,
      page,
      schoolGradeId: filters.schoolGradeId.trim() || null,
      search: filters.search.trim() || null,
      size,
      status: filters.status || null,
    },
  )

  return data.schoolClasses
}

export function useSchoolClassesQuery(
  page: number,
  size: number,
  filters: ClassFilters,
) {
  return useQuery({
    queryFn: () => fetchSchoolClasses({ filters, page, size }),
    queryKey: classManagementQueryKeys.classes(page, size, filters),
  })
}
