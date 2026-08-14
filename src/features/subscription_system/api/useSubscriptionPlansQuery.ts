import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { SubscriptionPlanPage } from '../types'

export const subscriptionPlanQueryKeys = {
  all: ['subscription-plans'] as const,
  list: (page: number, size: number) =>
    [...subscriptionPlanQueryKeys.all, 'list', page, size] as const,
}

const PLAN_FIELDS = `
  id
  name
  tagline
  pricePerYear
  validityDays
  maxTimePerAttemptMin
  popular
  status
  version
  createdAt
  createdBy
  replacedByPlanId
  serviceFeeRatio
  quotas {
    id
    quotaType
    includedQuantity
    tokenUnitPrice
  }
`

const SUBSCRIPTION_PLANS_QUERY = `
  query SubscriptionPlans($page: Int, $size: Int) {
    subscriptionPlans(page: $page, size: $size) {
      content {
        ${PLAN_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

async function fetchSubscriptionPlans(page: number, size: number): Promise<SubscriptionPlanPage> {
  const data = await graphQLRequest<{ subscriptionPlans: SubscriptionPlanPage }>(
    SUBSCRIPTION_PLANS_QUERY,
    { page: page - 1, size },
  )

  const response = data.subscriptionPlans
  return {
    ...response,
    page: response.page + 1,
  }
}

export function useSubscriptionPlansQuery(page: number, size: number) {
  return useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchSubscriptionPlans(page, size),
    queryKey: subscriptionPlanQueryKeys.list(page, size),
  })
}
