// src/features/school/api/useSchoolUserQuery.ts

import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient'
import type { SchoolUser } from '../types'

export const schoolUserQueryKeys = {
  all: ['schoolUser'] as const,
  detail: (schoolId: string, userId: string) => 
    [...schoolUserQueryKeys.all, 'detail', schoolId, userId] as const,
}

const GET_SCHOOL_USER_QUERY = `
  query GetSchoolUser($schoolId: ID!, $userId: ID!) {
    schoolUser(schoolId: $schoolId, userId: $userId) {
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
        createdAt
        updatedAt
        roles {
          id
          code
          name
        }
      }
    }
  }
`

async function fetchSchoolUser(schoolId: string, userId: string): Promise<SchoolUser | null> {
  const data = await graphQLRequest<{ schoolUser: SchoolUser | null }>(
    GET_SCHOOL_USER_QUERY,
    { schoolId, userId }
  )
  return data.schoolUser
}

export function useSchoolUserQuery(schoolId?: string | null, userId?: string | null) {
  return useQuery({
    queryKey: schoolUserQueryKeys.detail(schoolId || '', userId || ''),
    queryFn: () => fetchSchoolUser(schoolId!, userId!),
    enabled: Boolean(schoolId && userId),
    staleTime: 5 * 60 * 1000, 
  })
}