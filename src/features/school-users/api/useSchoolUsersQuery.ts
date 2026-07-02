import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { PageResult, SchoolUser, SchoolUserFilters } from '../types'

/** Shared selection set for SchoolUser rows (list + detail). */
export const SCHOOL_USER_FIELDS = `
  id
  schoolId
  userId
  startDate
  endDate
  user {
    id
    email
    phone
    fullName
    gender
    dateOfBirth
    address
    avatarUrl
    roles { id code name }
  }
`

export const schoolUserManagementQueryKeys = {
  all: ['school-user-management'] as const,
  classesByUser: (userId: string | null, page: number, size: number) =>
    [
      ...schoolUserManagementQueryKeys.all,
      'classes-by-user',
      userId,
      page,
      size,
    ] as const,
  detail: (userId: string | null) =>
    [...schoolUserManagementQueryKeys.all, 'detail', userId] as const,
  students: (page: number, size: number, filters: SchoolUserFilters) =>
    [
      ...schoolUserManagementQueryKeys.all,
      'students',
      page,
      size,
      filters.search,
      filters.status,
    ] as const,
  teachers: (page: number, size: number, filters: SchoolUserFilters) =>
    [
      ...schoolUserManagementQueryKeys.all,
      'teachers',
      page,
      size,
      filters.search,
      filters.status,
    ] as const,
}

export type SchoolUsersByRoleField =
  | 'schoolStudentsBySchool'
  | 'schoolTeachersBySchool'

type FetchSchoolUsersByRoleInput = {
  filters: SchoolUserFilters
  page: number
  size: number
}

/**
 * Fetches school users for a role-specific query. `schoolStudentsBySchool` and
 * `schoolTeachersBySchool` share the same variables and response shape, differing
 * only by the root field name.
 */
export async function fetchSchoolUsersByRole(
  field: SchoolUsersByRoleField,
  { filters, page, size }: FetchSchoolUsersByRoleInput,
) {
  const schoolId = requireSchoolId()
  const query = `
    query SchoolUsersByRole(
      $schoolId: ID!
      $page: Int!
      $size: Int!
      $search: String
      $status: String
    ) {
      ${field}(
        schoolId: $schoolId
        page: $page
        size: $size
        search: $search
        status: $status
      ) {
        content {
          ${SCHOOL_USER_FIELDS}
        }
        page
        size
        totalElements
        totalPages
      }
    }
  `

  const data = await graphQLRequest<Record<string, PageResult<SchoolUser>>>(
    query,
    {
      page,
      schoolId,
      search: filters.search.trim() || null,
      size,
      status: filters.status || null,
    },
  )

  return data[field]
}
