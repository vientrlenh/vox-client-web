import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { SubscriptionQuota } from '../types'

export const schoolSubscriptionUsageQueryKeys = {
  all: ['school-subscription-usage'] as const,
  bySchool: (schoolId: string) => [...schoolSubscriptionUsageQueryKeys.all, schoolId] as const,
}

const SCHOOL_SUBSCRIPTION_USAGE_QUERY = `
  query SchoolSubscriptionUsage($schoolId: ID!) {
    subscriptionUsage(schoolId: $schoolId) {
      id
      subscriptionId
      quotaType
      totalAllocated
      usedQuantity
    }
  }
`

async function fetchSchoolSubscriptionUsage(schoolId: string): Promise<SubscriptionQuota[]> {
  const data = await graphQLRequest<{ subscriptionUsage: SubscriptionQuota[] }>(SCHOOL_SUBSCRIPTION_USAGE_QUERY, {
    schoolId,
  })

  return data.subscriptionUsage
}

export function useSchoolSubscriptionUsageQuery(schoolId: string | null) {
  return useQuery({
    enabled: Boolean(schoolId),
    queryFn: () => fetchSchoolSubscriptionUsage(schoolId as string),
    queryKey: schoolSubscriptionUsageQueryKeys.bySchool(schoolId ?? ''),
  })
}
