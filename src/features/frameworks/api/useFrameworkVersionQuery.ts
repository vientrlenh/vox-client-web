import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { FrameworkVersionDetail } from '../types'
import { frameworkQueryKeys } from './useFrameworksQuery'

const FRAMEWORK_VERSION_QUERY = `
  query FrameworkVersion($id: ID!) {
    frameworkVersion(id: $id) {
      id
      frameworkId
      code
      name
      description
      version
      effectiveFrom
      effectiveTo
      status
      createdAt
      updatedAt
      criteria {
        id
        code
        name
        description
        order
        frameworkVersionId
        bands {
          id
          descriptor
          frameworkCriterionId
          frameworkResultBandId
          positiveSignals {
            values {
              description
              code
              evidenceHint
              importance
            }
          }
          negativeSignals {
            values {
              code
              description
              evidenceHint
              importance
            }
          }
        }
      }
      resultBands {
        id
        code
        label
        description
        order
        frameworkVersionId
      }
    }
  }
`

type FrameworkVersionQueryData = {
  frameworkVersion: FrameworkVersionDetail | null
}

export async function fetchFrameworkVersion(id: string) {
  const data = await graphQLRequest<FrameworkVersionQueryData>(
    FRAMEWORK_VERSION_QUERY,
    { id },
  )

  return data.frameworkVersion
}

export function useFrameworkVersionQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => {
      if (!id) {
        throw new Error('Framework version id is required')
      }

      return fetchFrameworkVersion(id)
    },
    queryKey: frameworkQueryKeys.version(id),
  })
}
