import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { SchoolUser } from '../types'
import { schoolUserManagementQueryKeys } from './useSchoolUsersQuery'

const SCHOOL_USER_QUERY = `
  query SchoolUser($schoolId: ID!, $userId: ID!) {
    schoolUser(schoolId: $schoolId, userId: $userId) {
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
        gender
        dateOfBirth
        address
        avatarUrl
        schoolRoles { id code name }
      }
    }
  }
`

type SchoolUserQueryData = {
  schoolUser: SchoolUser | null
}

export async function fetchSchoolUser(userId: string) {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<SchoolUserQueryData>(SCHOOL_USER_QUERY, {
    schoolId,
    userId,
  })

  return data.schoolUser
}

export function useSchoolUserQuery(userId: string | null) {
  return useQuery({
    enabled: Boolean(userId),
    queryFn: () => fetchSchoolUser(userId as string),
    queryKey: schoolUserManagementQueryKeys.detail(userId),
  })
}
