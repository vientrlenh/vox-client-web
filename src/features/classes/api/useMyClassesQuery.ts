import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type {
  MyClass,
  MyClassFilters,
  MyClassMemberFilters,
  PageResult,
} from '../types'

const MY_CLASS_FIELDS = `
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
  activeMemberCount
  schoolGrade {
    id
    code
    name
  }
  language {
    id
    code
    name
  }
`

const MY_CLASSES_QUERY = `
  query MyClasses(
    $schoolId: ID!
    $search: String
    $status: String
    $page: Int!
    $size: Int!
  ) {
    myClasses(
      schoolId: $schoolId
      search: $search
      status: $status
      page: $page
      size: $size
    ) {
      content {
        ${MY_CLASS_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type MyClassesQueryData = {
  myClasses: PageResult<MyClass>
}

// Namespace riêng, không dùng chung `classManagementQueryKeys` của màn quản lý:
// hai bề mặt gọi hai query GraphQL khác nhau nên cache không được phép đá nhau.
export const myClassQueryKeys = {
  all: ['my-classes'] as const,
  detail: (classId: string | null) =>
    [...myClassQueryKeys.all, 'detail', classId] as const,
  list: (
    schoolId: string,
    page: number,
    size: number,
    filters: MyClassFilters,
  ) =>
    [
      ...myClassQueryKeys.all,
      'list',
      schoolId,
      page,
      size,
      filters.search,
      filters.status,
    ] as const,
  members: (
    classId: string | null,
    page: number,
    size: number,
    filters: MyClassMemberFilters,
  ) =>
    [
      ...myClassQueryKeys.all,
      'members',
      classId,
      page,
      size,
      filters.search,
      filters.roleCode,
    ] as const,
}

export const MY_CLASS_FIELDS_FRAGMENT = MY_CLASS_FIELDS

export async function fetchMyClasses(
  schoolId: string,
  page: number,
  size: number,
  filters: MyClassFilters,
) {
  const data = await graphQLRequest<MyClassesQueryData>(MY_CLASSES_QUERY, {
    page,
    schoolId,
    search: filters.search.trim() || null,
    size,
    status: filters.status || null,
  })

  return data.myClasses
}

export function useMyClassesQuery(
  schoolId: string,
  page: number,
  size: number,
  filters: MyClassFilters,
) {
  return useQuery({
    enabled: Boolean(schoolId),
    queryFn: () => fetchMyClasses(schoolId, page, size, filters),
    queryKey: myClassQueryKeys.list(schoolId, page, size, filters),
  })
}
