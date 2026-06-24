import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { SchoolClass } from '../types'
import { classManagementQueryKeys } from './useSchoolClassesQuery'

const SCHOOL_CLASS_QUERY = `
  query SchoolClass($id: ID!) {
    schoolClass(id: $id) {
      id
      schoolId
      languageId
      schoolGradeId
      code
      name
      description
      status
      createdAt
      updatedAt
      school {
        id
        name
        code
      }
      language {
        id
        name
        code
      }
      schoolGrade {
        id
        name
        code
      }
    }
  }
`

type SchoolClassQueryData = {
  schoolClass: SchoolClass | null
}

export async function fetchSchoolClass(id: string) {
  const data = await graphQLRequest<SchoolClassQueryData>(SCHOOL_CLASS_QUERY, {
    id,
  })

  return data.schoolClass
}

export function useSchoolClassQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchSchoolClass(id as string),
    queryKey: classManagementQueryKeys.classDetail(id),
  })
}
