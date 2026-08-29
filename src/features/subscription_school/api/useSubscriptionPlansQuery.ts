import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { SubscriptionPlan, SubscriptionPlanPage } from '../types'

export const subscriptionPlanQueryKeys = {
  all: ['school-visible-plans'] as const,
  list: (page: number, size: number) => [...subscriptionPlanQueryKeys.all, 'list', page, size] as const,
}

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
          status
          replacedByPlanId
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

type SubscriptionPlanListItemDto = {
  isMostPopular: boolean
  subscription: SubscriptionPlan
}

type SubscriptionPlanPageDto = {
  content: SubscriptionPlanListItemDto[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

async function fetchSubscriptionPlans(page: number, size: number): Promise<SubscriptionPlanPage> {
  const data = await graphQLRequest<{ subscriptionPlans: SubscriptionPlanPageDto }>(SUBSCRIPTION_PLANS_QUERY, {
    page,
    size,
  })

  const response = data.subscriptionPlans
  return {
    ...response,
    // BE bọc mỗi gói trong một dòng danh sách (SubscriptionPlanListItem) vì "phổ biến nhất" là kết
    // quả so sánh giữa các gói trong danh sách, không phải thuộc tính của riêng một gói -- gộp phẳng
    // lại thành SubscriptionPlan[] kèm isMostPopular cho tiện dùng ở UI.
    content: response.content.map((item) => ({ ...item.subscription, isMostPopular: item.isMostPopular })),
  }
}

export function useSubscriptionPlansQuery(page: number, size: number) {
  return useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchSubscriptionPlans(page, size),
    queryKey: subscriptionPlanQueryKeys.list(page, size),
  })
}
