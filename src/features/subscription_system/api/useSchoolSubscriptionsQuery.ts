import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { SchoolFilters, SchoolSubscriptionPage } from '../types'

export const schoolSubscriptionQueryKeys = {
  all: ['school-subscriptions'] as const,
  list: (filters: SchoolFilters, page: number, size: number) =>
    [...schoolSubscriptionQueryKeys.all, 'list', filters, page, size] as const,
}

const SCHOOL_SUBSCRIPTIONS_QUERY = `
  query SchoolSubscriptions($keyword: String, $planId: ID, $status: SubscriptionStatus, $page: Int, $size: Int) {
    schoolSubscriptions(keyword: $keyword, planId: $planId, status: $status, page: $page, size: $size) {
      content {
        id
        schoolId
        planId
        startDate
        endDate
        status
        pricePaidSnapshot
        cancelledAt
        createdAt
        plan {
          id
          name
          pricePerYear
          maxTimePerAttemptMin
          quotas {
            id
            quotaType
            includedQuantity
            tokenUnitPrice
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
      page: page - 1,
      planId: filters.planId || null,
      size,
      status: filters.status || null,
    },
  )

  const response = data.schoolSubscriptions
  return {
    ...response,
    page: response.page + 1,
  }
}

export function useSchoolSubscriptionsQuery(filters: SchoolFilters, page: number, size: number) {
  return useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchSchoolSubscriptions(filters, page, size),
    queryKey: schoolSubscriptionQueryKeys.list(filters, page, size),
  })
}
