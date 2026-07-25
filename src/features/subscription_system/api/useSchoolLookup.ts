import { useMemo } from 'react'
import { useSchoolsQuery } from '@/features/school/api/useSchoolsQuery'

const LOOKUP_PAGE_SIZE = 500

export type SchoolLookupEntry = {
  id: string
  code: string
  name: string
  address: string | null
}

export function useSchoolLookup() {
  const schoolsQuery = useSchoolsQuery(1, LOOKUP_PAGE_SIZE)

  const lookup = useMemo(() => {
    const map = new Map<string, SchoolLookupEntry>()

    for (const school of schoolsQuery.data?.content ?? []) {
      map.set(school.id, {
        address: school.address ?? null,
        code: school.code,
        id: school.id,
        name: school.name ?? school.code,
      })
    }

    return map
  }, [schoolsQuery.data])

  return {
    getSchool: (schoolId: string) => lookup.get(schoolId) ?? null,
    isLoading: schoolsQuery.isLoading,
  }
}
