// src/features/school/api/useSchoolsQuery.ts

import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient' // Đổi sang dùng graphqlClient
import type { SchoolPage } from '../types'

export const schoolQueryKeys = {
  all: ['schools'] as const,
  list: (page: number, size: number) =>
    [...schoolQueryKeys.all, 'list', { page, size }] as const,
}




// Cú pháp khai báo biến trong GraphQL ($page: Int, $size: Int) 
// phải khớp chính xác kiểu với lúc gửi đi
const GET_SCHOOLS_QUERY = `
  query GetSchools($page: Int, $size: Int) {
    schools(page: $page, size: $size) {
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

async function fetchSchools(page: number, size: number): Promise<SchoolPage> {
  // graphQLRequest tự động gom data, variables và bóc tách error cho bạn
  const data = await graphQLRequest<{ schools: SchoolPage }>(
    GET_SCHOOLS_QUERY,
    { page, size }
  )

  return data.schools
}

export function useSchoolsQuery(page: number, size: number) {
  return useQuery({
    queryKey: schoolQueryKeys.list(page, size),
    queryFn: () => fetchSchools(page, size),
  })
}

