// src/features/school/api/useSchoolsQuery.ts

import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient' // Đổi sang dùng graphqlClient
import type { SchoolPage } from '../types'

export const schoolQueryKeys = {
  all: ['schools'] as const,
  list: (page: number, size: number, search: string | null, isActive: boolean | null) =>
    [...schoolQueryKeys.all, 'list', { page, size, search, isActive }] as const,
}




// Cú pháp khai báo biến trong GraphQL ($page: Int, $size: Int)
// phải khớp chính xác kiểu với lúc gửi đi
const GET_SCHOOLS_QUERY = `
  query GetSchools($page: Int, $size: Int, $search: String, $isActive: Boolean) {
    schools(page: $page, size: $size, search: $search, isActive: $isActive) {
      content {
        id
        code
        name
        description
        contactPhone
        contactEmail
        address
        domain
        studentCount
        isActive
        createdAt
        updatedAt
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

async function fetchSchools(
  page: number,
  size: number,
  search: string | null,
  isActive: boolean | null,
): Promise<SchoolPage> {
  // graphQLRequest tự động gom data, variables và bóc tách error cho bạn
  const data = await graphQLRequest<{ schools: SchoolPage }>(
    GET_SCHOOLS_QUERY,
    { page, size, search, isActive }
  )

  return data.schools
}

export function useSchoolsQuery(
  page: number,
  size: number,
  search: string | null = null,
  isActive: boolean | null = null,
) {
  return useQuery({
    queryKey: schoolQueryKeys.list(page, size, search, isActive),
    queryFn: () => fetchSchools(page, size, search, isActive),
  })
}

