import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'

export type MyExamQuotaAllocation = {
  allocatedAmountVnd: number
  usedAmountVnd: number
}

export const myExamQuotaAllocationQueryKeys = {
  all: ['my-exam-quota-allocation'] as const,
}

// myClassTestQuotaAllocation không còn tồn tại: hạn mức thi của một người là MỘT ví (EXAM), dùng
// chung cho cả kỳ thi tập trung lẫn bài kiểm tra trên lớp.
const MY_EXAM_QUOTA_ALLOCATION_QUERY = `
  query MyExamQuotaAllocation {
    myExamQuotaAllocation {
      allocatedAmountVnd
      usedAmountVnd
    }
  }
`

// null = giáo viên không có hạn mức EXAM cá nhân riêng, chỉ ví của trường áp dụng — khớp đúng ý
// nghĩa null ở ClassTestTokenQuotaGuardService.requireWithinUserAllocation phía BE.
export async function fetchMyExamQuotaAllocation(): Promise<MyExamQuotaAllocation | null> {
  const data = await graphQLRequest<{ myExamQuotaAllocation: MyExamQuotaAllocation | null }>(
    MY_EXAM_QUOTA_ALLOCATION_QUERY,
  )

  return data.myExamQuotaAllocation ?? null
}

export function useMyExamQuotaAllocationQuery() {
  return useQuery({
    queryFn: fetchMyExamQuotaAllocation,
    queryKey: myExamQuotaAllocationQueryKeys.all,
  })
}
