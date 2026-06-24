import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { ClassUser, PageResult } from '../types'
import { classManagementQueryKeys } from './useSchoolClassesQuery'

const SCHOOL_CLASS_USERS_QUERY = `
  query SchoolClassUsers($schoolClassId: ID!, $page: Int!, $size: Int!) {
    schoolClassUsers(schoolClassId: $schoolClassId, page: $page, size: $size) {
      content {
        id
        userId
        schoolClassId
        isActive
        joinedAt
        leftAt
        assignedBy
        user {
          id
          email
          phone
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

type SchoolClassUsersQueryData = {
  schoolClassUsers: PageResult<ClassUser>
}

export async function fetchSchoolClassUsers(
  schoolClassId: string,
  page: number,
  size: number,
) {
  const data = await graphQLRequest<SchoolClassUsersQueryData>(
    SCHOOL_CLASS_USERS_QUERY,
    {
      page,
      schoolClassId,
      size,
    },
  )

  return data.schoolClassUsers
}

export function useSchoolClassUsersQuery(
  schoolClassId: string | null,
  page: number,
  size: number,
) {
  return useQuery({
    enabled: Boolean(schoolClassId),
    queryFn: () => fetchSchoolClassUsers(schoolClassId as string, page, size),
    queryKey: classManagementQueryKeys.classUsers(schoolClassId, page, size),
  })
}
