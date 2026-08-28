import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'

export type QuotaPricing = {
  estimatedCostPerExamSecondUsd: number
}

export const quotaPricingQueryKeys = {
  all: ['quota-pricing'] as const,
}

const QUOTA_PRICING_QUERY = `
  query QuotaPricing {
    quotaPricing {
      estimatedCostPerExamSecondUsd
    }
  }
`

export async function fetchQuotaPricing(): Promise<QuotaPricing> {
  const data = await graphQLRequest<{ quotaPricing: QuotaPricing }>(QUOTA_PRICING_QUERY)
  return data.quotaPricing
}

// Giá quy đổi + tỷ giá để hiển thị (giá bán token, quy đổi VND). Ước lượng chi phí bài kiểm tra thì
// KHÔNG nhân ở FE nữa — dùng query examTokenEstimate (useExamTokenEstimateQuery) để con số hiện ra
// khớp đúng cái ClassTestTokenQuotaGuardService dùng để chặn.
export function useQuotaPricingQuery() {
  return useQuery({
    queryFn: fetchQuotaPricing,
    queryKey: quotaPricingQueryKeys.all,
  })
}
