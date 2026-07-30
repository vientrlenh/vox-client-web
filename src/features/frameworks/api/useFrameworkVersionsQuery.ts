import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { FrameworkVersionPage } from '../types'
import { frameworkQueryKeys } from './useFrameworksQuery'

const FRAMEWORK_VERSIONS_QUERY = `
  query FrameworkVersions($frameworkId: ID!, $page: Int!, $size: Int!) {
    frameworkVersions(frameworkId: $frameworkId, page: $page, size: $size) {
      content {
        id
        frameworkId
        name
        status
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

type FrameworkVersionsQueryData = {
  frameworkVersions: FrameworkVersionPage
}

export async function fetchFrameworkVersions(
  frameworkId: string,
  page: number,
  size: number,
) {
  const data = await graphQLRequest<FrameworkVersionsQueryData>(
    FRAMEWORK_VERSIONS_QUERY,
    { frameworkId, page, size },
  )

  return data.frameworkVersions
}

export function useFrameworkVersionsQuery(
  frameworkId: string,
  page: number,
  size: number,
) {
  return useQuery({
    queryFn: () => fetchFrameworkVersions(frameworkId, page, size),
    queryKey: frameworkQueryKeys.versions(frameworkId, page, size),
  })
}
