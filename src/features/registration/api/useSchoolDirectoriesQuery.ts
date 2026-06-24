import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { SchoolDirectory } from '../types'

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

const SCHOOL_DIRECTORY_CURSOR_QUERY = `
  query SchoolDirectoryCursorPage($cursor: ID, $limit: Int!) {
    schoolDirectoryCursorPage(cursor: $cursor, limit: $limit) {
      content {
        ${SCHOOL_DIRECTORY_FIELDS}
      }
      nextCursor
      hasNext
    }
  }
`

type SchoolDirectoryCursorPage = {
  content: SchoolDirectory[]
  hasNext: boolean
  nextCursor: string | null
}

type SchoolDirectoryCursorQueryData = {
  schoolDirectoryCursorPage: SchoolDirectoryCursorPage
}

type FetchSchoolDirectoryCursorPageInput = {
  cursor: string | null
  limit: number
}

export const schoolDirectoryQueryKeys = {
  all: ['school-directories'] as const,
  cursor: (limit: number) =>
    [...schoolDirectoryQueryKeys.all, 'cursor', limit] as const,
}

export async function fetchSchoolDirectoryCursorPage({
  cursor,
  limit,
}: FetchSchoolDirectoryCursorPageInput) {
  const data = await graphQLRequest<SchoolDirectoryCursorQueryData>(
    SCHOOL_DIRECTORY_CURSOR_QUERY,
    {
      cursor,
      limit,
    },
  )

  return data.schoolDirectoryCursorPage
}

export function useSchoolDirectoriesQuery(limit: number) {
  return useInfiniteQuery<
    SchoolDirectoryCursorPage,
    Error,
    InfiniteData<SchoolDirectoryCursorPage, string | null>,
    ReturnType<typeof schoolDirectoryQueryKeys.cursor>,
    string | null
  >({
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      fetchSchoolDirectoryCursorPage({ cursor: pageParam, limit }),
    queryKey: schoolDirectoryQueryKeys.cursor(limit),
  })
}
