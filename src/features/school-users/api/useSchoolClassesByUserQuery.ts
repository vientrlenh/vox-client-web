import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { SchoolClass } from '@/features/classes/types'
import type { PageResult } from '../types'
import { schoolUserManagementQueryKeys } from './useSchoolUsersQuery'

const SCHOOL_CLASSES_BY_USER_QUERY = `
  query SchoolClassesByUser(
    $schoolId: ID!
    $userId: ID!
    $page: Int
    $size: Int
  ) {
    schoolClassesByUser(
      schoolId: $schoolId
      userId: $userId
      page: $page
      size: $size
    ) {
      content {
        id
        code
        name
        status
        schoolGrade { id name }
        language { id name }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type SchoolClassesByUserQueryData = {
  schoolClassesByUser: PageResult<SchoolClass>
}

export async function fetchSchoolClassesByUser(
  userId: string,
  page: number,
  size: number,
) {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<SchoolClassesByUserQueryData>(
    SCHOOL_CLASSES_BY_USER_QUERY,
    {
      page,
      schoolId,
      size,
      userId,
    },
  )

  return data.schoolClassesByUser
}

export function useSchoolClassesByUserQuery(
  userId: string | null,
  page: number,
  size: number,
) {
  return useQuery({
    enabled: Boolean(userId),
    queryFn: () => fetchSchoolClassesByUser(userId as string, page, size),
    queryKey: schoolUserManagementQueryKeys.classesByUser(userId, page, size),
  })
}
