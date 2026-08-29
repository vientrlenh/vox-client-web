import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'

export type MyPracticeQuotaAllocation = {
  allocatedAmountVnd: number
  usedAmountVnd: number
}

export const myPracticeQuotaAllocationQueryKeys = {
  all: ['my-practice-quota-allocation'] as const,
}

const MY_PRACTICE_QUOTA_ALLOCATION_QUERY = `
  query MyPracticeQuotaAllocation {
    myPracticeQuotaAllocation {
      allocatedAmountVnd
      usedAmountVnd
    }
  }
`

// null = học sinh không có hạn mức PRACTICE cá nhân riêng, chỉ ví của trường áp dụng.
export async function fetchMyPracticeQuotaAllocation(): Promise<MyPracticeQuotaAllocation | null> {
  const data = await graphQLRequest<{ myPracticeQuotaAllocation: MyPracticeQuotaAllocation | null }>(
    MY_PRACTICE_QUOTA_ALLOCATION_QUERY,
  )

  return data.myPracticeQuotaAllocation ?? null
}

export function useMyPracticeQuotaAllocationQuery() {
  return useQuery({
    queryFn: fetchMyPracticeQuotaAllocation,
    queryKey: myPracticeQuotaAllocationQueryKeys.all,
  })
}
