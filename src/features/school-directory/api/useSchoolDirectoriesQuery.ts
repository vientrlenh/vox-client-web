import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { PageResult, SchoolDirectory } from '../types'

const SCHOOL_DIRECTORY_FIELDS = `
  id
  code
  name
  provinceName
  districtName
  domain
  address
  verified
`

const SCHOOL_DIRECTORY_PAGE_QUERY = `
  query SchoolDirectoryPage($page: Int!, $size: Int!) {
    schoolDirectoryPage(page: $page, size: $size) {
      content {
        ${SCHOOL_DIRECTORY_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type SchoolDirectoryPageQueryData = {
  schoolDirectoryPage: PageResult<SchoolDirectory>
}

type FetchSchoolDirectoriesInput = {
  page: number
  size: number
}

export const schoolDirectoryManagementQueryKeys = {
  all: ['school-directory-management'] as const,
  detail: (id: string | null) =>
    [...schoolDirectoryManagementQueryKeys.all, 'detail', id] as const,
  list: (page: number, size: number) =>
    [...schoolDirectoryManagementQueryKeys.all, 'list', page, size] as const,
}

export async function fetchSchoolDirectories({
  page,
  size,
}: FetchSchoolDirectoriesInput) {
  const data = await graphQLRequest<SchoolDirectoryPageQueryData>(
    SCHOOL_DIRECTORY_PAGE_QUERY,
    {
      page,
      size,
    },
  )

  return data.schoolDirectoryPage
}

export function useSchoolDirectoriesQuery(page: number, size: number) {
  return useQuery({
    queryFn: () => fetchSchoolDirectories({ page, size }),
    queryKey: schoolDirectoryManagementQueryKeys.list(page, size),
  })
}
