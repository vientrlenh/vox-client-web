import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { QuotaType, TokenQuotaUsage } from './useTokenUsageBreakdownQuery'

export type TokenUsageGranularity = 'DAY' | 'WEEK' | 'MONTH'

export type TokenUsageTimeseriesPoint = {
  bucket: string
  quotaType: QuotaType
  tokensConsumed: number
}

export type TokenUsageTimeseries = {
  granularity: TokenUsageGranularity
  totalUsed: number
  points: TokenUsageTimeseriesPoint[]
  currentPeriod: TokenQuotaUsage[]
}

const TOKEN_USAGE_TIMESERIES_QUERY = `
  query SchoolTokenUsageTimeseries($schoolId: ID!, $dateFrom: String, $dateTo: String, $granularity: TokenUsageGranularity) {
    schoolTokenUsageTimeseries(schoolId: $schoolId, dateFrom: $dateFrom, dateTo: $dateTo, granularity: $granularity) {
      granularity
      totalUsed
      points {
        bucket
        quotaType
        tokensConsumed
      }
      currentPeriod {
        id
        quotaType
        totalAllocated
        usedQuantity
      }
    }
  }
`

async function fetchTokenUsageTimeseries(
  dateFrom: string | null,
  dateTo: string | null,
  granularity: TokenUsageGranularity,
): Promise<TokenUsageTimeseries> {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<{ schoolTokenUsageTimeseries: TokenUsageTimeseries }>(TOKEN_USAGE_TIMESERIES_QUERY, {
    schoolId,
    dateFrom,
    dateTo,
    granularity,
  })
  return data.schoolTokenUsageTimeseries
}

export const tokenUsageTimeseriesQueryKeys = {
  all: ['token-usage-timeseries'] as const,
  range: (dateFrom: string | null, dateTo: string | null, granularity: TokenUsageGranularity) =>
    [...tokenUsageTimeseriesQueryKeys.all, dateFrom, dateTo, granularity] as const,
}

export function useTokenUsageTimeseriesQuery(dateFrom: string | null, dateTo: string | null, granularity: TokenUsageGranularity = 'DAY') {
  return useQuery({
    queryFn: () => fetchTokenUsageTimeseries(dateFrom, dateTo, granularity),
    queryKey: tokenUsageTimeseriesQueryKeys.range(dateFrom, dateTo, granularity),
  })
}
