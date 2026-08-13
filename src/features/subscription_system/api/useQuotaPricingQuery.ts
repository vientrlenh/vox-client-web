import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'

export type QuotaPricing = {
  usdToVndRate: number
}

export const quotaPricingQueryKeys = {
  all: ['quota-pricing'] as const,
}

const QUOTA_PRICING_QUERY = `
  query QuotaPricing {
    quotaPricing {
      usdToVndRate
    }
  }
`

async function fetchQuotaPricing(): Promise<QuotaPricing> {
  const data = await graphQLRequest<{ quotaPricing: QuotaPricing }>(QUOTA_PRICING_QUERY)
  return data.quotaPricing
}

// Tỷ giá USD->VND thị trường (config toàn hệ thống, xem QuotaSellingPriceProperties bên BE) --
// kết hợp với serviceFeeRatio riêng của từng gói để PlanEditorDrawer hiện giá gợi ý, KHÔNG dùng
// để tính toán gì bắt buộc, chỉ tham khảo cho admin lúc đặt giá.
export function useQuotaPricingQuery() {
  return useQuery({
    queryFn: fetchQuotaPricing,
    queryKey: quotaPricingQueryKeys.all,
  })
}
