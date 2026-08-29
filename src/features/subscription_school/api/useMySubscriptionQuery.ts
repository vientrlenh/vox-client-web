import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { MySubscription } from '../types'

export const mySubscriptionQueryKeys = {
  all: ['my-subscription'] as const,
}

const MY_SUBSCRIPTION_QUERY = `
  query MySubscription($schoolId: ID!) {
    schoolSubscription(schoolId: $schoolId) {
      id
      schoolId
      subscriptionPlanId
      startDate
      endDate
      status
      pricePaidSnapshot
      cancelledAt
      suspendedAt
      suspendedReason
      plan {
        id
        name
        tagline
        priceVnd
        periodType
        periodCount
        maxTimePerAttemptMin
        status
        replacedByPlanId
        quotas {
          id
          quotaType
          includedAmountVnd
        }
      }
    }
  }
`

export async function fetchMySubscription(): Promise<MySubscription | null> {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<{ schoolSubscription: MySubscription | null }>(MY_SUBSCRIPTION_QUERY, {
    schoolId,
  })

  return data.schoolSubscription
}

export function useMySubscriptionQuery() {
  return useQuery({
    queryFn: fetchMySubscription,
    queryKey: mySubscriptionQueryKeys.all,
  })
}
