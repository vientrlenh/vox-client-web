import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { MyClassMember, MyClassMemberFilters, PageResult } from '../types'
import { myClassQueryKeys } from './useMyClassesQuery'

const MY_CLASS_MEMBERS_QUERY = `
  query MyClassMembers(
    $schoolClassId: ID!
    $roleCode: String
    $search: String
    $page: Int!
    $size: Int!
  ) {
    myClassMembers(
      schoolClassId: $schoolClassId
      roleCode: $roleCode
      search: $search
      page: $page
      size: $size
    ) {
      content {
        id
        userId
        schoolClassId
        isActive
        joinedAt
        leftAt
        user {
          id
          fullName
          email
          phone
          roleCodes
        }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type MyClassMembersQueryData = {
  myClassMembers: PageResult<MyClassMember>
}

export async function fetchMyClassMembers(
  schoolClassId: string,
  page: number,
  size: number,
  filters: MyClassMemberFilters,
) {
  const data = await graphQLRequest<MyClassMembersQueryData>(
    MY_CLASS_MEMBERS_QUERY,
    {
      page,
      roleCode: filters.roleCode || null,
      schoolClassId,
      search: filters.search.trim() || null,
      size,
    },
  )

  return data.myClassMembers
}

export function useMyClassMembersQuery(
  schoolClassId: string | null,
  page: number,
  size: number,
  filters: MyClassMemberFilters,
) {
  return useQuery({
    enabled: Boolean(schoolClassId),
    queryFn: () =>
      fetchMyClassMembers(schoolClassId as string, page, size, filters),
    queryKey: myClassQueryKeys.members(schoolClassId, page, size, filters),
  })
}
