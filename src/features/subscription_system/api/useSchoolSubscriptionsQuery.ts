import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { SchoolFilters, SchoolSubscriptionPage } from '../types'

export const schoolSubscriptionQueryKeys = {
  all: ['school-subscriptions'] as const,
  byPlan: (subscriptionPlanId: string, filters: SchoolFilters, page: number, size: number) =>
    [...schoolSubscriptionQueryKeys.all, 'by-plan', subscriptionPlanId, filters, page, size] as const,
  list: (filters: SchoolFilters, page: number, size: number) =>
    [...schoolSubscriptionQueryKeys.all, 'list', filters, page, size] as const,
}

const SCHOOL_SUBSCRIPTIONS_QUERY = `
  query SchoolSubscriptions(
    $keyword: String
    $subscriptionPlanId: ID
    $status: SchoolSubscriptionStatus
    $page: Int
    $size: Int
  ) {
    schoolSubscriptions(
      keyword: $keyword
      subscriptionPlanId: $subscriptionPlanId
      status: $status
      page: $page
      size: $size
    ) {
      content {
        id
        schoolId
        subscriptionPlanId
        startDate
        endDate
        status
        pricePaidSnapshot
        cancelledAt
        createdAt
        suspendedAt
        suspendedReason
        suspendedBy
        school {
          id
          name
        }
        plan {
          id
          name
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

async function fetchSchoolSubscriptions(
  filters: SchoolFilters,
  page: number,
  size: number,
): Promise<SchoolSubscriptionPage> {
  const data = await graphQLRequest<{ schoolSubscriptions: SchoolSubscriptionPage }>(
    SCHOOL_SUBSCRIPTIONS_QUERY,
    {
      keyword: filters.keyword.trim() || null,
      page,
      size,
      status: filters.status || null,
      subscriptionPlanId: filters.subscriptionPlanId || null,
    },
  )

  return data.schoolSubscriptions
}

export function useSchoolSubscriptionsQuery(filters: SchoolFilters, page: number, size: number) {
  return useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchSchoolSubscriptions(filters, page, size),
    queryKey: schoolSubscriptionQueryKeys.list(filters, page, size),
  })
}

/**
 * Danh sách trường của MỘT gói, cho trang chi tiết gói.
 *
 * Dùng lại đúng query trên với bộ lọc subscriptionPlanId — không cần API riêng. Tách hook để khoá
 * cache khác nhau: trang danh sách và trang chi tiết lọc khác nhau nên không được dùng chung entry.
 */
export function useSchoolSubscriptionsByPlanQuery(
  subscriptionPlanId: string | undefined,
  filters: Omit<SchoolFilters, 'subscriptionPlanId'>,
  page: number,
  size: number,
) {
  const merged: SchoolFilters = { ...filters, subscriptionPlanId: subscriptionPlanId ?? '' }

  return useQuery({
    enabled: Boolean(subscriptionPlanId),
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchSchoolSubscriptions(merged, page, size),
    queryKey: schoolSubscriptionQueryKeys.byPlan(subscriptionPlanId ?? '', merged, page, size),
  })
}
