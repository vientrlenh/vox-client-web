import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { SubscriptionQuota } from '../types'

export const mySubscriptionUsageQueryKeys = {
  all: ['my-subscription-usage'] as const,
}

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

export async function fetchMySubscriptionUsage(): Promise<SubscriptionQuota[]> {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<{ subscriptionUsage: SubscriptionQuota[] }>(MY_SUBSCRIPTION_USAGE_QUERY, {
    schoolId,
  })

  return data.subscriptionUsage
}

export function useMySubscriptionUsageQuery() {
  return useQuery({
    queryFn: fetchMySubscriptionUsage,
    queryKey: mySubscriptionUsageQueryKeys.all,
  })
}
