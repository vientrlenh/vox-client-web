import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { SupportedLanguage } from '../types'
import { languageQueryKeys } from './useSupportedLanguagesQuery'

const SUPPORTED_LANGUAGE_QUERY = `
  query SupportedLanguage($id: ID!) {
    supportedLanguage(id: $id) {
      id
      code
      name
      description
      isActive
      createdAt
      updatedAt
    }
  }
`

type SupportedLanguageQueryData = {
  supportedLanguage: SupportedLanguage | null
}

export async function fetchSupportedLanguage(id: string) {
  const data = await graphQLRequest<SupportedLanguageQueryData>(
    SUPPORTED_LANGUAGE_QUERY,
    { id },
  )

  return data.supportedLanguage
}

export function useSupportedLanguageQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => {
      if (!id) {
        throw new Error('Supported language id is required')
      }

      return fetchSupportedLanguage(id)
    },
    queryKey: languageQueryKeys.language(id),
  })
}
