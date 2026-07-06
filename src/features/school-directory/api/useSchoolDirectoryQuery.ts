import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import { schoolDirectoryManagementQueryKeys } from './useSchoolDirectoriesQuery'
import type { SchoolDirectory } from '../types'

const SCHOOL_DIRECTORY_QUERY = `
  query SchoolDirectory($id: ID!) {
    schoolDirectory(id: $id) {
      id
      code
      name
      provinceCode
      provinceName
      districtName
      domain
      address
      origin
      verified
      createdAt
      updatedAt
    }
  }
`

type SchoolDirectoryQueryData = {
  schoolDirectory: SchoolDirectory | null
}

export async function fetchSchoolDirectory(id: string) {
  const data = await graphQLRequest<SchoolDirectoryQueryData>(
    SCHOOL_DIRECTORY_QUERY,
    { id },
  )

  return data.schoolDirectory
}

export function useSchoolDirectoryQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => {
      if (!id) {
        throw new Error('School directory id is required')
      }

      return fetchSchoolDirectory(id)
    },
    queryKey: schoolDirectoryManagementQueryKeys.detail(id),
  })
}
