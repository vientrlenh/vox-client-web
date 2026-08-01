import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { Framework } from '../types'
import { frameworkQueryKeys } from './useFrameworksQuery'

const FRAMEWORK_QUERY = `
  query Framework($id: ID!) {
    framework(id: $id) {
      id
      name
      description
      isActive
      createdAt
      updatedAt
    }
  }
`

type FrameworkQueryData = {
  framework: Framework | null
}

export async function fetchFramework(id: string) {
  const data = await graphQLRequest<FrameworkQueryData>(FRAMEWORK_QUERY, { id })

  return data.framework
}

export function useFrameworkQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => {
      if (!id) {
        throw new Error('Framework id is required')
      }

      return fetchFramework(id)
    },
    queryKey: frameworkQueryKeys.framework(id),
  })
}
