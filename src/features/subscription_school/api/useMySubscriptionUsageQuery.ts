import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { SubscriptionQuotaRecord } from '../model'

export const mySubscriptionUsageQueryKeys = {
  all: ['my-subscription-usage'] as const,
}

// subscriptionId -> schoolSubscriptionId, totalAllocated -> totalAllocatedAmountVnd,
// usedQuantity -> usedAmountVnd. Số đo giờ là VND chứ không phải USD -- xem ../model.
const MY_SUBSCRIPTION_USAGE_QUERY = `
  query MySubscriptionUsage($schoolId: ID!) {
    subscriptionUsage(schoolId: $schoolId) {
      id
      schoolSubscriptionId
      quotaType
      totalAllocatedAmountVnd
      usedAmountVnd
    }
  }
`

export async function fetchMySubscriptionUsage(): Promise<SubscriptionQuotaRecord[]> {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<{ subscriptionUsage: SubscriptionQuotaRecord[] }>(
    MY_SUBSCRIPTION_USAGE_QUERY,
    { schoolId },
  )

  return data.subscriptionUsage
}

export function useMySubscriptionUsageQuery() {
  return useQuery({
    queryFn: fetchMySubscriptionUsage,
    queryKey: mySubscriptionUsageQueryKeys.all,
  })
}
