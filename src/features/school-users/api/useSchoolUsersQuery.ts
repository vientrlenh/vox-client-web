import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { PageResult, SchoolUser, SchoolUserFilters } from '../types'

const SCHOOL_USER_FIELDS = `
  id
  schoolId
  userId
  startDate
  endDate
  user {
    id
    email
    phone
    fullName
    gender
    dateOfBirth
    address
    avatarUrl
    schoolRoles { id code name }
  }
`

const SCHOOL_USERS_QUERY = `
  query SchoolUsers(
    $schoolId: ID!
    $page: Int!
    $size: Int!
    $search: String
    $role: String
    $status: String
  ) {
    schoolUsersBySchool(
      schoolId: $schoolId
      page: $page
      size: $size
      search: $search
      role: $role
      status: $status
    ) {
      content {
        ${SCHOOL_USER_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type SchoolUsersQueryData = {
  schoolUsersBySchool: PageResult<SchoolUser>
}

type FetchSchoolUsersInput = {
  filters: SchoolUserFilters
  page: number
  size: number
}

export const schoolUserManagementQueryKeys = {
  all: ['school-user-management'] as const,
  detail: (userId: string | null) =>
    [...schoolUserManagementQueryKeys.all, 'detail', userId] as const,
  list: (page: number, size: number, filters: SchoolUserFilters) =>
    [
      ...schoolUserManagementQueryKeys.all,
      'list',
      page,
      size,
      filters.search,
      filters.role,
      filters.status,
    ] as const,
}

export async function fetchSchoolUsers({
  filters,
  page,
  size,
}: FetchSchoolUsersInput) {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<SchoolUsersQueryData>(SCHOOL_USERS_QUERY, {
    page,
    role: filters.role || null,
    schoolId,
    search: filters.search.trim() || null,
    size,
    status: filters.status || null,
  })

  return data.schoolUsersBySchool
}

export function useSchoolUsersQuery(
  page: number,
  size: number,
  filters: SchoolUserFilters,
) {
  return useQuery({
    queryFn: () => fetchSchoolUsers({ filters, page, size }),
    queryKey: schoolUserManagementQueryKeys.list(page, size, filters),
  })
}
