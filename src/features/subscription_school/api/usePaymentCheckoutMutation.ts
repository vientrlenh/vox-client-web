import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { PaymentLink, PaymentMethod } from '@/shared/payment/types'
import type { MutationResult } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

export type CreatePaymentCheckoutPayload = {
  orderId: string
  provider: PaymentMethod
}

// Bước thứ hai, DÙNG CHUNG cho mọi luồng đặt đơn (đăng ký/nâng cấp gói, gia hạn, nạp thêm số dư):
// bước một luôn là tạo đơn PENDING (POST /v1/orders/...), bước này mới thật sự mở phiên thanh toán.
// Tách riêng vì BE tách riêng -- CreateSubscriptionOrderUseCase/CreateTopUpOrderUseCase/
// RenewSchoolSubscriptionUseCase không hề gọi tới cổng, chỉ CreatePaymentCheckoutUrlUseCase mới gọi.
async function createPaymentCheckoutUrl(payload: CreatePaymentCheckoutPayload): Promise<MutationResult<PaymentLink>> {
  const response = await apiClient.post<ApiResponse<PaymentLink>>('/v1/payments/checkout-url', payload)
  return response.data
}

export function useCreatePaymentCheckoutMutation() {
  return useMutation({
    mutationFn: createPaymentCheckoutUrl,
  })
}
