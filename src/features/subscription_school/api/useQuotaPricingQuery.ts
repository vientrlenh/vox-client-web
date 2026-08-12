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

// Giá dùng để ước lượng worst-case chi phí AI trước khi publish/sửa bài kiểm tra trên lớp
// (xem estimateClassTestCostUsd) — lấy từ BE thay vì hardcode ở FE để không bao giờ lệch với
// giá trị QuotaPricingProperties mà ClassTestTokenQuotaGuardService thật sự dùng để chặn.
export function useQuotaPricingQuery() {
  return useQuery({
    queryFn: fetchQuotaPricing,
    queryKey: quotaPricingQueryKeys.all,
  })
}
