import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { RequestStatus, SubscriptionRequestPage } from '../types'

export const subscriptionRequestQueryKeys = {
  all: ['subscription-requests'] as const,
  list: (status: RequestStatus, page: number, size: number) =>
    [...subscriptionRequestQueryKeys.all, 'list', status, page, size] as const,
}

const SUBSCRIPTION_REQUESTS_QUERY = `
  query SubscriptionRequests($status: RequestStatus!, $page: Int, $size: Int) {
    subscriptionRequests(status: $status, page: $page, size: $size) {
      content {
        id
        schoolId
        requestType
        currentPlanId
        requestedPlanId
        amount
        status
        submittedAt
        reviewedBy
        reviewedAt
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

async function fetchSubscriptionRequests(
  status: RequestStatus,
  page: number,
  size: number,
): Promise<SubscriptionRequestPage> {
  const data = await graphQLRequest<{ subscriptionRequests: SubscriptionRequestPage }>(
    SUBSCRIPTION_REQUESTS_QUERY,
    { page: page - 1, size, status },
  )

  const response = data.subscriptionRequests
  return {
    ...response,
    page: response.page + 1,
  }
}

export function useSubscriptionRequestsQuery(status: RequestStatus, page: number, size: number) {
  return useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchSubscriptionRequests(status, page, size),
    queryKey: subscriptionRequestQueryKeys.list(status, page, size),
  })
}
