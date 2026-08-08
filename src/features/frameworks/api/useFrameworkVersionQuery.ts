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

type FrameworkVersionQueryData = {
  frameworkVersion: FrameworkVersionDetail | null
}

type SchoolFrameworkVersionQueryData = {
  schoolFrameworkVersion: FrameworkVersionDetail | null
}

export async function fetchFrameworkVersion(id: string, isSchoolAdmin = false) {
  if (isSchoolAdmin) {
    const data = await graphQLRequest<SchoolFrameworkVersionQueryData>(
      SCHOOL_FRAMEWORK_VERSION_QUERY,
      { id },
    )
    return data.schoolFrameworkVersion
  }

  const data = await graphQLRequest<FrameworkVersionQueryData>(
    FRAMEWORK_VERSION_QUERY,
    { id },
  )

  return data.frameworkVersion
}

export function useFrameworkVersionQuery(id: string | null, isSchoolAdmin = false) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => {
      if (!id) {
        throw new Error('Framework version id is required')
      }

      return fetchFrameworkVersion(id, isSchoolAdmin)
    },
    queryKey: [...frameworkQueryKeys.version(id), isSchoolAdmin ? 'school' : 'system'] as const,
  })
}
