import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { SchoolDebtEventPage } from '../types'

export const schoolDebtEventsQueryKeys = {
  all: ['school-debt-events'] as const,
  list: (schoolId: string, page: number, size: number) =>
    [...schoolDebtEventsQueryKeys.all, schoolId, page, size] as const,
}

const SCHOOL_DEBT_EVENTS_QUERY = `
  query SchoolDebtEvents($schoolId: ID!, $page: Int, $size: Int) {
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

async function fetchSchoolDebtEvents(schoolId: string, page: number, size: number): Promise<SchoolDebtEventPage> {
  const data = await graphQLRequest<{ schoolDebtEvents: SchoolDebtEventPage }>(SCHOOL_DEBT_EVENTS_QUERY, {
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

export function useSchoolDebtEventsQuery(schoolId: string | null, page: number, size: number) {
  return useQuery({
    enabled: Boolean(schoolId),
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchSchoolDebtEvents(schoolId as string, page, size),
    queryKey: schoolDebtEventsQueryKeys.list(schoolId ?? '', page, size),
  })
}
