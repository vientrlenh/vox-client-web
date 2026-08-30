import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { QuotaUserAllocationPage } from '../types'

export const quotaAllocationQueryKeys = {
  all: ['quota-allocation'] as const,
  exam: (page: number, search: string) => [...quotaAllocationQueryKeys.all, 'exam', page, search] as const,
  practice: (page: number, search: string) => [...quotaAllocationQueryKeys.all, 'practice', page, search] as const,
}

/**
 * Đường ĐỌC chuyển từ REST sang GraphQL, vì hai lý do không sửa được ở REST:
 *
 * 1. Dòng phân bổ ở REST không mang tên người dùng, nên cột "Họ tên" luôn rỗng. Ở đây `user` được
 *    nối qua data loader `userById` -- cả trang gom thành đúng một truy vấn users.
 * 2. REST trả về MỌI người đủ điều kiện trong một lượt. Một trường vài nghìn học sinh thì đó là vài
 *    nghìn dòng mỗi lần mở trang.
 *
 * Đường GHI vẫn ở REST (PUT .../exam-quota, .../practice-quota) -- đọc GraphQL, ghi REST theo đúng
 * quy ước chung của dự án.
 */
// Hai truy vấn viết ĐẦY ĐỦ, không dùng một hằng số chung nối bằng `${...}`.
//
// Nối chuỗi ở JavaScript làm câu truy vấn không phân tích tĩnh được, nên mọi công cụ soi truy vấn
// với schema đều lặng lẽ bỏ qua nó -- đúng loại lỗi mà màn hình này vừa dính (client hỏi một đường
// dẫn và một trường mà backend không có). Lặp lại vài dòng rẻ hơn nhiều so với mất khả năng kiểm.

const EXAM_QUERY = `
  query SchoolExamQuotaUserAllocations($schoolId: ID!, $search: String, $page: Int!, $size: Int!) {
    schoolExamQuotaUserAllocations(schoolId: $schoolId, search: $search, page: $page, size: $size) {
      pool {
        id
        schoolSubscriptionId
        quotaType
        totalAllocatedAmountVnd
        usedAmountVnd
      }
      distributedAmountVnd
      distributableRatio
      distributableAmountVnd
      page
      size
      totalElements
      totalPages
      content {
        userId
        allocatedAmountVnd
        usedAmountVnd
        user {
          id
          fullName
          email
        }
      }
    }
  }
`

const PRACTICE_QUERY = `
  query SchoolPracticeQuotaUserAllocations($schoolId: ID!, $search: String, $page: Int!, $size: Int!) {
    schoolPracticeQuotaUserAllocations(schoolId: $schoolId, search: $search, page: $page, size: $size) {
      pool {
        id
        schoolSubscriptionId
        quotaType
        totalAllocatedAmountVnd
        usedAmountVnd
      }
      distributedAmountVnd
      distributableRatio
      distributableAmountVnd
      page
      size
      totalElements
      totalPages
      content {
        userId
        allocatedAmountVnd
        usedAmountVnd
        user {
          id
          fullName
          email
        }
      }
    }
  }
`

export function useExamQuotaAllocationsQuery(page: number, size: number, search: string) {
  return useQuery({
    // Giữ dữ liệu trang cũ trong lúc tải trang mới: bảng không nháy về rỗng mỗi lần lật trang hay gõ
    // vào ô tìm kiếm.
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const schoolId = requireSchoolId()
      const data = await graphQLRequest<{ schoolExamQuotaUserAllocations: QuotaUserAllocationPage }>(EXAM_QUERY, {
        page,
        schoolId,
        search: search.trim() || null,
        size,
      })
      return data.schoolExamQuotaUserAllocations
    },
    queryKey: [...quotaAllocationQueryKeys.exam(page, search), size],
  })
}

export function usePracticeQuotaAllocationsQuery(page: number, size: number, search: string) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const schoolId = requireSchoolId()
      const data = await graphQLRequest<{ schoolPracticeQuotaUserAllocations: QuotaUserAllocationPage }>(
        PRACTICE_QUERY,
        { page, schoolId, search: search.trim() || null, size },
      )
      return data.schoolPracticeQuotaUserAllocations
    },
    queryKey: [...quotaAllocationQueryKeys.practice(page, search), size],
  })
}
