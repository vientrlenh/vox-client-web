import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { MutationResult } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

export type CreateSubscriptionOrderPayload = {
  subscriptionPlanId: string
}

/**
 * Đặt đơn mua/nâng cấp một chu kỳ gói -- CreateSubscriptionOrderUseCase ở BE tự so giá gói mới với
 * gói đang dùng để quyết định đây là đăng ký mới hay nâng cấp, FE không cần (và không thể) khai báo
 * requestType. Trả về id đơn ở trạng thái PENDING; gói CHƯA được cấp cho tới khi thanh toán xong --
 * bước tiếp theo luôn là useCreatePaymentCheckoutMutation.
 */
async function createSubscriptionOrder(payload: CreateSubscriptionOrderPayload): Promise<MutationResult<string>> {
  const response = await apiClient.post<ApiResponse<string>>('/v1/orders/subscription', payload)
  return response.data
}

export function useCreateSubscriptionOrderMutation() {
  return useMutation({
    mutationFn: createSubscriptionOrder,
  })
}
