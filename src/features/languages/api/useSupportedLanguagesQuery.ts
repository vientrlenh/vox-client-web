import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { LanguageFilters, SupportedLanguagePage } from '../types'

const SUPPORTED_LANGUAGE_FIELDS = `
  id
  code
  name
  description
  isActive
  createdAt
  updatedAt
`

const SUPPORTED_LANGUAGES_QUERY = `
  query SupportedLanguages($page: Int!, $size: Int!, $search: String, $isActive: Boolean) {
    supportedLanguages(page: $page, size: $size, search: $search, isActive: $isActive) {
      content {
        ${SUPPORTED_LANGUAGE_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type SupportedLanguagesQueryData = {
  supportedLanguages: SupportedLanguagePage
}

export type FetchSupportedLanguagesInput = {
  filters: LanguageFilters
  page: number
  size: number
}

export const languageQueryKeys = {
  all: ['languages'] as const,
  language: (id: string | null) =>
    [...languageQueryKeys.all, 'detail', id] as const,
  languages: (page: number, size: number, filters: LanguageFilters) =>
    [
      ...languageQueryKeys.all,
      'list',
      page,
      size,
      filters.search,
      filters.isActive,
    ] as const,
}

function toIsActiveFilter(value: LanguageFilters['isActive']) {
  if (value === 'active') {
    return true
  }

  if (value === 'inactive') {
    return false
  }

  return null
}

export async function fetchSupportedLanguages({
  filters,
  page,
  size,
}: FetchSupportedLanguagesInput) {
  const data = await graphQLRequest<SupportedLanguagesQueryData>(
    SUPPORTED_LANGUAGES_QUERY,
    {
      isActive: toIsActiveFilter(filters.isActive),
      page,
      search: filters.search.trim() || null,
      size,
    },
  )

  return data.supportedLanguages
}

export function useSupportedLanguagesQuery(
  page: number,
  size: number,
  filters: LanguageFilters,
) {
  return useQuery({
    queryFn: () => fetchSupportedLanguages({ filters, page, size }),
    queryKey: languageQueryKeys.languages(page, size, filters),
  })
}
