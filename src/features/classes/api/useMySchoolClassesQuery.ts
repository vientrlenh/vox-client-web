import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { PageResult, SchoolClass } from '../types'
import { classManagementQueryKeys } from './useSchoolClassesQuery'

const MY_SCHOOL_CLASSES_QUERY = `
  query MySchoolClasses(
    $schoolId: ID!
    $status: String
    $page: Int!
    $size: Int!
  ) {
    mySchoolClasses(
      schoolId: $schoolId
      status: $status
      page: $page
      size: $size
    ) {
      content {
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
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type MySchoolClassesQueryData = {
  mySchoolClasses: PageResult<SchoolClass>
}

export function useMySchoolClassesQuery(
  page: number,
  size: number,
  schoolId: string,
  status?: string,
) {
  return useQuery({
    enabled: Boolean(schoolId),
    queryFn: async () => {
      const data = await graphQLRequest<MySchoolClassesQueryData>(
        MY_SCHOOL_CLASSES_QUERY,
        {
          page,
          schoolId,
          size,
          status: status || null,
        },
      )
      return data.mySchoolClasses
    },
    queryKey: [
      ...classManagementQueryKeys.all,
      'my-school-classes',
      page,
      size,
      schoolId,
      status,
    ],
  })
}
