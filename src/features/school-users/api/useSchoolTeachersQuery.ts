import { useQuery } from '@tanstack/react-query'
import type { SchoolUserFilters } from '../types'
import {
  fetchSchoolUsersByRole,
  schoolUserManagementQueryKeys,
} from './useSchoolUsersQuery'

export function useSchoolTeachersQuery(
  page: number,
  size: number,
  filters: SchoolUserFilters,
) {
  return useQuery({
    queryFn: () =>
      fetchSchoolUsersByRole('schoolTeachersBySchool', { filters, page, size }),
    queryKey: schoolUserManagementQueryKeys.teachers(page, size, filters),
  })
}
