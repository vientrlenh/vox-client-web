import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { PageResult, SchoolUser } from '../types'
import { classManagementQueryKeys } from './useSchoolClassesQuery'

const SCHOOL_USERS_QUERY = `
  query SchoolUsersBySchool(
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
        id
        schoolId
        userId
        startDate
        endDate
        user {
          id
          email
          fullName
          phone
        }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type SchoolUsersBySchoolQueryData = {
  schoolUsersBySchool: PageResult<SchoolUser>
}

type SchoolUsersBySchoolFilters = {
  role?: string
  schoolId: string
  search?: string
  status?: string
}

export function useSchoolUsersBySchoolQuery(
  page: number,
  size: number,
  filters: SchoolUsersBySchoolFilters,
) {
  return useQuery({
    enabled: Boolean(filters.schoolId),
    queryFn: async () => {
      const data = await graphQLRequest<SchoolUsersBySchoolQueryData>(
        SCHOOL_USERS_QUERY,
        {
          page,
          role: filters.role || null,
          schoolId: filters.schoolId,
          search: filters.search?.trim() || null,
          size,
          status: filters.status || null,
        },
      )

      return data.schoolUsersBySchool
    },
    queryKey: [
      ...classManagementQueryKeys.all,
      'school-users',
      page,
      size,
      filters.schoolId,
      filters.search,
      filters.role,
      filters.status,
    ],
  })
}
