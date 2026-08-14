import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { SchoolDebtEventPage } from '../types'

export const myDebtEventsQueryKeys = {
  all: ['my-debt-events'] as const,
  list: (page: number, size: number) => [...myDebtEventsQueryKeys.all, 'list', page, size] as const,
}

const MY_DEBT_EVENTS_QUERY = `
  query MySchoolDebtEvents($schoolId: ID!, $page: Int, $size: Int) {
    schoolDebtEvents(schoolId: $schoolId, page: $page, size: $size) {
      content {
        id
        subscriptionId
        eventType
        quotaType
        triggerExamSessionId
        triggerAmountUsd
        totalAllocatedUsd
        usedQuantityUsd
        overageUsd
        occurredAt
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

async function fetchMyDebtEvents(page: number, size: number): Promise<SchoolDebtEventPage> {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<{ schoolDebtEvents: SchoolDebtEventPage }>(MY_DEBT_EVENTS_QUERY, {
    page: page - 1,
    schoolId,
    size,
  })

  const response = data.schoolDebtEvents
  return {
    ...response,
    page: response.page + 1,
  }
}

export function useMyDebtEventsQuery(page: number, size: number) {
  return useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchMyDebtEvents(page, size),
    queryKey: myDebtEventsQueryKeys.list(page, size),
  })
}
