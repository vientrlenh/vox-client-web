import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { FrameworkVersionDetail } from '../types'
import { frameworkQueryKeys } from './useFrameworksQuery'

const FRAMEWORK_VERSION_FIELDS = `
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
`

// System Admin xem được version ở mọi trạng thái (BE: @PreAuthorize hasRole('SYSTEM_ADMIN'))
const FRAMEWORK_VERSION_QUERY = `
  query FrameworkVersion($id: ID!) {
    frameworkVersion(id: $id) {
      ${FRAMEWORK_VERSION_FIELDS}
    }
  }
`

// School Admin chỉ xem được version đã PUBLISHED (BE: query riêng schoolFrameworkVersion, hasRole('SCHOOL_ADMIN'))
const SCHOOL_FRAMEWORK_VERSION_QUERY = `
  query SchoolFrameworkVersion($id: ID!) {
    schoolFrameworkVersion(id: $id) {
      ${FRAMEWORK_VERSION_FIELDS}
    }
  }
`

export type FrameworkVersionQueryScope = 'system' | 'school'

type FrameworkVersionQueryData = {
  frameworkVersion?: FrameworkVersionDetail | null
  schoolFrameworkVersion?: FrameworkVersionDetail | null
}

export async function fetchFrameworkVersion(
  id: string,
  scope: FrameworkVersionQueryScope = 'system',
) {
  const data = await graphQLRequest<FrameworkVersionQueryData>(
    scope === 'school' ? SCHOOL_FRAMEWORK_VERSION_QUERY : FRAMEWORK_VERSION_QUERY,
    { id },
  )

  return (scope === 'school' ? data.schoolFrameworkVersion : data.frameworkVersion) ?? null
}

export function useFrameworkVersionQuery(
  id: string | null,
  scope: FrameworkVersionQueryScope = 'system',
) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => {
      if (!id) {
        throw new Error('Framework version id is required')
      }

      return fetchFrameworkVersion(id, scope)
    },
    queryKey: [...frameworkQueryKeys.version(id), scope] as const,
  })
}
