import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { PageResult, SchoolDirectory } from '../types'

// ⚠️ GIẢ ĐỊNH: query `schoolDirectories` chưa được BE xác nhận.
// Field-list theo type SchoolDirectory — cần đối chiếu schema thật khi BE sẵn sàng.
const SCHOOL_DIRECTORY_FIELDS = `
  id
  name
  domain
  district
  province
  address
  source
`

const SCHOOL_DIRECTORIES_QUERY = `
  query SchoolDirectories($page: Int!, $size: Int!, $search: String) {
    schoolDirectories(page: $page, size: $size, search: $search) {
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

type SchoolDirectoriesQueryData = {
  schoolDirectories: PageResult<SchoolDirectory>
}

type FetchSchoolDirectoriesInput = {
  page: number
  search: string
  size: number
}

export const schoolDirectoryQueryKeys = {
  all: ['school-directories'] as const,
  list: (page: number, size: number, search: string) =>
    [...schoolDirectoryQueryKeys.all, 'list', page, size, search] as const,
}

export async function fetchSchoolDirectories({
  page,
  search,
  size,
}: FetchSchoolDirectoriesInput) {
  const data = await graphQLRequest<SchoolDirectoriesQueryData>(
    SCHOOL_DIRECTORIES_QUERY,
    {
      page,
      search: search.trim() || null,
      size,
    },
  )

  return data.schoolDirectories
}

export function useSchoolDirectoriesQuery(
  page: number,
  size: number,
  search: string,
) {
  return useQuery({
    queryFn: () => fetchSchoolDirectories({ page, search, size }),
    queryKey: schoolDirectoryQueryKeys.list(page, size, search),
  })
}
