import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { SubscriptionPlanPage } from '../types'

export const subscriptionPlanQueryKeys = {
  all: ['school-visible-plans'] as const,
  list: (page: number, size: number) => [...subscriptionPlanQueryKeys.all, 'list', page, size] as const,
}

// content[] KHÔNG phải là gói trần mà là SubscriptionPlanListItem: gói nằm trong `subscription`, kèm
// cờ isMostPopular tính trên TOÀN hệ thống (không phải trong trang này). status không hỏi nữa --
// trường chỉ được thấy gói đang bán, việc lọc là của backend.
const SUBSCRIPTION_PLANS_QUERY = `
  query SubscriptionPlans($page: Int, $size: Int) {
    subscriptionPlans(page: $page, size: $size) {
      content {
        isMostPopular
        subscription {
          id
          name
          tagline
          priceVnd
          periodType
          periodCount
          maxTimePerAttemptMin
          quotas {
            id
            quotaType
            includedAmountVnd
          }
        }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

async function fetchSubscriptionPlans(page: number, size: number): Promise<SubscriptionPlanPage> {
  const data = await graphQLRequest<{ subscriptionPlans: SubscriptionPlanPage }>(SUBSCRIPTION_PLANS_QUERY, {
    page,
    size,
  })

  return data.subscriptionPlans
}

export function useSubscriptionPlansQuery(page: number, size: number) {
  return useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchSubscriptionPlans(page, size),
    queryKey: subscriptionPlanQueryKeys.list(page, size),
  })
}
