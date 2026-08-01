import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { FrameworkFilters, FrameworkPage } from '../types'

const FRAMEWORK_FIELDS = `
  id
  name
  description
  isActive
  createdAt
  updatedAt
`

const FRAMEWORKS_QUERY = `
  query Frameworks($page: Int!, $size: Int!, $search: String, $isActive: Boolean) {
    frameworks(page: $page, size: $size, search: $search, isActive: $isActive) {
      content {
        ${FRAMEWORK_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type FrameworksQueryData = {
  frameworks: FrameworkPage
}

export type FetchFrameworksInput = {
  filters: FrameworkFilters
  page: number
  size: number
}

export const frameworkQueryKeys = {
  all: ['frameworks'] as const,
  framework: (id: string | null) =>
    [...frameworkQueryKeys.all, 'detail', id] as const,
  frameworks: (page: number, size: number, filters: FrameworkFilters) =>
    [
      ...frameworkQueryKeys.all,
      'list',
      page,
      size,
      filters.search,
      filters.isActive,
    ] as const,
  version: (versionId: string | null) =>
    [...frameworkQueryKeys.all, 'version', versionId] as const,
  versions: (frameworkId: string, page: number, size: number) =>
    [...frameworkQueryKeys.all, frameworkId, 'versions', page, size] as const,
}

function toIsActiveFilter(value: FrameworkFilters['isActive']) {
  if (value === 'active') {
    return true
  }

  if (value === 'inactive') {
    return false
  }

  return null
}

export async function fetchFrameworks({
  filters,
  page,
  size,
}: FetchFrameworksInput) {
  const data = await graphQLRequest<FrameworksQueryData>(FRAMEWORKS_QUERY, {
    isActive: toIsActiveFilter(filters.isActive),
    page,
    search: filters.search.trim() || null,
    size,
  })

  return data.frameworks
}

export function useFrameworksQuery(
  page: number,
  size: number,
  filters: FrameworkFilters,
) {
  return useQuery({
    queryFn: () => fetchFrameworks({ filters, page, size }),
    queryKey: frameworkQueryKeys.frameworks(page, size, filters),
  })
}
