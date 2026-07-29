import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type {
  ClassUserCandidate,
  ClassUserCandidateFilters,
  PageResult,
} from '../types'
import { requireSchoolId } from './schoolClassApiUtils'
import { classManagementQueryKeys } from './useSchoolClassesQuery'

/**
 * Endpoint thêm vào lớp từ chối mọi tài khoản không ACTIVE, nên chỉ hỏi nhóm này —
 * bày người đang tạm dừng/bị khóa ra chỉ tạo lựa chọn chắc chắn thất bại. Mặc định
 * của backend rộng hơn (mọi trạng thái trừ DISABLED) nên phải chốt ở đây.
 */
const CANDIDATE_STATUS = 'ACTIVE'

/**
 * Danh sách người dùng của trường có thể thêm vào một lớp. `excludeClassId` để backend
 * loại bỏ những người đang là thành viên active của lớp đó (người đã rời lớp vẫn hiện
 * để có thể thêm lại).
 */
const SCHOOL_USERS_NOT_IN_CLASS_QUERY = `
  query SchoolUsersNotInClass(
    $schoolId: ID!
    $page: Int!
    $size: Int!
    $search: String
    $roleCode: String
    $status: String
    $excludeClassId: ID
  ) {
    schoolUsersBySchool(
      schoolId: $schoolId
      page: $page
      size: $size
      search: $search
      roleCode: $roleCode
      status: $status
      excludeClassId: $excludeClassId
    ) {
      content {
        id
        userId
        user {
          id
          email
          phone
          fullName
          roles {
            id
            code
            name
          }
        }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type SchoolUsersNotInClassData = {
  schoolUsersBySchool: PageResult<ClassUserCandidate>
}

export async function fetchSchoolUsersNotInClass(
  classId: string,
  page: number,
  size: number,
  filters: ClassUserCandidateFilters,
) {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<SchoolUsersNotInClassData>(
    SCHOOL_USERS_NOT_IN_CLASS_QUERY,
    {
      excludeClassId: classId,
      page,
      roleCode: filters.roleCode || null,
      schoolId,
      search: filters.search.trim() || null,
      size,
      status: CANDIDATE_STATUS,
    },
  )

  return data.schoolUsersBySchool
}

export function useSchoolUsersNotInClassQuery(
  classId: string | null,
  page: number,
  size: number,
  filters: ClassUserCandidateFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    enabled: Boolean(classId) && (options?.enabled ?? true),
    queryFn: () =>
      fetchSchoolUsersNotInClass(classId as string, page, size, filters),
    queryKey: classManagementQueryKeys.usersNotInClass(
      classId,
      page,
      size,
      filters,
    ),
  })
}
