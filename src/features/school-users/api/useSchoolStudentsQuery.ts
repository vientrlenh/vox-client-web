import { useQuery } from '@tanstack/react-query'
import type { SchoolUserFilters } from '../types'
import {
  fetchSchoolUsersByRole,
  schoolUserManagementQueryKeys,
} from './useSchoolUsersQuery'

export function useSchoolStudentsQuery(
  page: number,
  size: number,
  filters: SchoolUserFilters,
) {
  return useQuery({
    queryFn: () =>
      fetchSchoolUsersByRole('schoolStudentsBySchool', { filters, page, size }),
    queryKey: schoolUserManagementQueryKeys.students(page, size, filters),
  })
}
