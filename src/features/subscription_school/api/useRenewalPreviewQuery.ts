import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { RenewalPreview } from '../types'

export const renewalPreviewQueryKeys = {
  all: ['renewal-preview'] as const,
}

/**
 * KHÔNG nhận tham số: gói cần gia hạn là gói gần nhất của chính trường đang đăng nhập.
 *
 * Phải gọi TRƯỚC khi đặt đơn gia hạn — renewalPlan.id chính là acceptedPlanId phải gửi lên. Gói đang
 * dùng có thể đã bị lưu trữ và gán gói thay thế, khi đó gia hạn tự chuyển sang gói mới với giá khác;
 * trường phải nhìn thấy và đồng ý trước.
 *
 * amountDue là GIÁ GÓI, chưa gồm phí dịch vụ — phí chỉ được cộng lúc đặt đơn. Nên đừng hiển thị nó
 * dưới nhãn "phải trả": xem PlanRenewalDialog.
 */
const RENEWAL_PREVIEW_QUERY = `
  query SchoolSubscriptionRenewalPreview {
    schoolSubscriptionRenewalPreview {
      planChanged
      startsAt
      amountDue
      currentPlan {
        id
        name
        priceVnd
        periodType
        periodCount
        quotas { id quotaType includedAmountVnd }
      }
      renewalPlan {
        id
        name
        priceVnd
        periodType
        periodCount
        quotas { id quotaType includedAmountVnd }
      }
    }
  }
`

export function useRenewalPreviewQuery(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: async () => {
      const data = await graphQLRequest<{ schoolSubscriptionRenewalPreview: RenewalPreview }>(
        RENEWAL_PREVIEW_QUERY,
      )
      return data.schoolSubscriptionRenewalPreview
    },
    queryKey: renewalPreviewQueryKeys.all,
  })
}
