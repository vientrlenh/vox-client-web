import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { SubscriptionPlan, SubscriptionPlanListItem } from '../types'

export const subscriptionPlanQueryKeys = {
  all: ['subscription-plans'] as const,
  detail: (id: string) => [...subscriptionPlanQueryKeys.all, 'detail', id] as const,
  list: (page: number, size: number) =>
    [...subscriptionPlanQueryKeys.all, 'list', page, size] as const,
}

const PLAN_FIELDS = `
  id
  name
  tagline
  priceVnd
  periodType
  periodCount
  maxTimePerAttemptMin
  status
  version
  createdAt
  createdBy
  updatedAt
  updatedBy
  replacedByPlanId
  quotas {
    id
    quotaType
    includedAmountVnd
  }
`

// content là SubscriptionPlanListItem chứ không phải SubscriptionPlan: "phổ biến nhất" là kết quả so
// gói này với mọi gói khác nên chỉ có nghĩa trong ngữ cảnh một danh sách, BE vì thế treo cờ ở lớp bọc.
const SUBSCRIPTION_PLANS_QUERY = `
  query SubscriptionPlans($page: Int, $size: Int) {
    subscriptionPlans(page: $page, size: $size) {
      content {
        isMostPopular
        subscription {
          ${PLAN_FIELDS}
        }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

const SUBSCRIPTION_PLAN_QUERY = `
  query SubscriptionPlan($id: ID!) {
    subscriptionPlan(id: $id) {
      ${PLAN_FIELDS}
    }
  }
`

export type SubscriptionPlanListPage = {
  content: SubscriptionPlanListItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

async function fetchSubscriptionPlans(page: number, size: number): Promise<SubscriptionPlanListPage> {
  const data = await graphQLRequest<{ subscriptionPlans: SubscriptionPlanListPage }>(
    SUBSCRIPTION_PLANS_QUERY,
    { page, size },
  )

  return data.subscriptionPlans
}

async function fetchSubscriptionPlan(id: string): Promise<SubscriptionPlan | null> {
  const data = await graphQLRequest<{ subscriptionPlan: SubscriptionPlan | null }>(
    SUBSCRIPTION_PLAN_QUERY,
    { id },
  )

  return data.subscriptionPlan
}

export function useSubscriptionPlansQuery(page: number, size: number) {
  return useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchSubscriptionPlans(page, size),
    queryKey: subscriptionPlanQueryKeys.list(page, size),
  })
}

export function useSubscriptionPlanQuery(id: string | undefined) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchSubscriptionPlan(id as string),
    queryKey: subscriptionPlanQueryKeys.detail(id ?? ''),
  })
}
