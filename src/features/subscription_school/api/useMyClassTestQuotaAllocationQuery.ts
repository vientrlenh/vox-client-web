import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'

export type MyClassTestQuotaAllocation = {
  allocatedAmountVnd: number
  usedAmountVnd: number
}

export const myClassTestQuotaAllocationQueryKeys = {
  all: ['my-class-test-quota-allocation'] as const,
}

// Trần chi CÁ NHÂN của giáo viên cho bài kiểm tra trên lớp -- quotaType = EXAM ở BE (không có ví
// CLASS_TEST riêng, xem QuotaType), nhưng vẫn expose qua field myExamQuotaAllocation.
const MY_CLASS_TEST_QUOTA_ALLOCATION_QUERY = `
  query MyClassTestQuotaAllocation {
    myExamQuotaAllocation {
      allocatedAmountVnd
      usedAmountVnd
    }
  }
`

// null = giáo viên không có hạn mức cá nhân riêng, chỉ ví EXAM của trường áp dụng -- khớp đúng ý
// nghĩa null ở ClassTestTokenQuotaGuardService.requireWithinUserAllocation phía BE.
export async function fetchMyClassTestQuotaAllocation(): Promise<MyClassTestQuotaAllocation | null> {
  const data = await graphQLRequest<{ myExamQuotaAllocation: MyClassTestQuotaAllocation | null }>(
    MY_CLASS_TEST_QUOTA_ALLOCATION_QUERY,
  )

  return data.myExamQuotaAllocation ?? null
}

export function useMyClassTestQuotaAllocationQuery() {
  return useQuery({
    queryFn: fetchMyClassTestQuotaAllocation,
    queryKey: myClassTestQuotaAllocationQueryKeys.all,
  })
}
