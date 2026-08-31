import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { QuotaType } from '@/features/subscription_school/types'

export type { QuotaType }

export type TokenQuotaUsage = {
  id: string
  quotaType: QuotaType
  totalAllocatedAmountVnd: number
  usedAmountVnd: number
}

/**
 * Cùng dữ liệu với "Mức sử dụng" ở trang gói dịch vụ (`subscriptionUsage`), tách riêng ở đây để
 * dashboard không phụ thuộc ngược vào feature `subscription_school`.
 */
const TOKEN_USAGE_BREAKDOWN_QUERY = `
  query TokenUsageBreakdown($schoolId: ID!) {
    subscriptionUsage(schoolId: $schoolId) {
      id
      quotaType
      totalAllocatedAmountVnd
      usedAmountVnd
    }
  }
`

async function fetchTokenUsageBreakdown(): Promise<TokenQuotaUsage[]> {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<{ subscriptionUsage: TokenQuotaUsage[] }>(TOKEN_USAGE_BREAKDOWN_QUERY, { schoolId })
  return data.subscriptionUsage
}

export const tokenUsageBreakdownQueryKeys = {
  all: ['token-usage-breakdown'] as const,
}

export function useTokenUsageBreakdownQuery() {
  return useQuery({
    queryFn: fetchTokenUsageBreakdown,
    queryKey: tokenUsageBreakdownQueryKeys.all,
  })
}
