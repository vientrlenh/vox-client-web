import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'

export type MyClassTestQuotaAllocation = {
  allocatedQuantity: number
  usedQuantity: number
}

export const myClassTestQuotaAllocationQueryKeys = {
  all: ['my-class-test-quota-allocation'] as const,
}

const MY_CLASS_TEST_QUOTA_ALLOCATION_QUERY = `
  query MyClassTestQuotaAllocation {
    myClassTestQuotaAllocation {
      allocatedQuantity
      usedQuantity
    }
  }
`

// null = giáo viên không có hạn mức CLASS_TEST cá nhân riêng, chỉ pool của trường áp dụng —
// khớp đúng ý nghĩa null ở ClassTestTokenQuotaGuardService.requireWithinUserAllocation phía BE.
export async function fetchMyClassTestQuotaAllocation(): Promise<MyClassTestQuotaAllocation | null> {
  const data = await graphQLRequest<{ myClassTestQuotaAllocation: MyClassTestQuotaAllocation | null }>(
    MY_CLASS_TEST_QUOTA_ALLOCATION_QUERY,
  )

  return data.myClassTestQuotaAllocation ?? null
}

export function useMyClassTestQuotaAllocationQuery() {
  return useQuery({
    queryFn: fetchMyClassTestQuotaAllocation,
    queryKey: myClassTestQuotaAllocationQueryKeys.all,
  })
}