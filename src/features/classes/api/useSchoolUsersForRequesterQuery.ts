import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { PageResult } from '../types'

const SCHOOL_USERS_FOR_REQUESTER_QUERY = `
  query SchoolUsersForRequester(
    $schoolId: ID!
    $page: Int!
    $size: Int!
    $search: String
    $status: String
  ) {
    schoolUsersForRequester(
      schoolId: $schoolId
      page: $page
      size: $size
      search: $search
      status: $status
    ) {
      content {
        id
        userId
        user {
          id
          email
          fullName
        }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type SchoolUserForRequester = {
  id: string
  userId: string
  user: {
    email: string
    fullName: string | null
    id: string
  } | null
}

type SchoolUsersForRequesterData = {
  schoolUsersForRequester: PageResult<SchoolUserForRequester>
}

type SchoolUsersForRequesterFilters = {
  schoolId: string
  search?: string
  status?: string
}

const schoolUsersForRequesterQueryKeys = {
  all: ['school-users-for-requester'] as const,
  list: (page: number, size: number, filters: SchoolUsersForRequesterFilters) =>
    [
      ...schoolUsersForRequesterQueryKeys.all,
      'list',
      page,
      size,
      filters.schoolId,
      filters.search,
      filters.status,
    ] as const,
}

export function useSchoolUsersForRequesterQuery(
  page: number,
  size: number,
  filters: SchoolUsersForRequesterFilters,
) {
  return useQuery({
    enabled: Boolean(filters.schoolId),
    queryFn: async () => {
      const data = await graphQLRequest<SchoolUsersForRequesterData>(
        SCHOOL_USERS_FOR_REQUESTER_QUERY,
        {
          page,
          schoolId: filters.schoolId,
          search: filters.search?.trim() || null,
          size,
          status: filters.status || null,
        },
      )
      return data.schoolUsersForRequester
    },
    queryKey: schoolUsersForRequesterQueryKeys.list(page, size, filters),
  })
}
