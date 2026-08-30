import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { PaymentLink, PaymentMethod } from '@/shared/payment/types'
import { orderQueryKeys } from './useOrderQueries'

type ApiResponse<TData> = {
  data: TData
  message: string
}

/**
 * Đặt đơn mua một chu kỳ gói. KHÔNG gửi kèm loại đơn: backend tự quyết đăng ký hay nâng cấp bằng
 * cách so giá gói mới với gói đang chạy, và tự tính khoản bù. Client đoán hộ là dựng một bản sao
 * của luật giá sẽ lệch.
 */
async function placeSubscriptionOrder(subscriptionPlanId: string): Promise<string> {
  const response = await apiClient.post<ApiResponse<string>>('/v1/orders/subscription', { subscriptionPlanId })
  return response.data.data
}

/**
 * Đặt đơn gia hạn. acceptedPlanId là gói người dùng ĐÃ NHÌN THẤY ở bước xem trước — bắt buộc, vì
 * gói đang dùng có thể đã ngừng bán và bị thay bằng gói khác giá khác.
 */
async function placeRenewalOrder(acceptedPlanId: string): Promise<string> {
  const response = await apiClient.post<ApiResponse<string>>('/v1/orders/renewal', { acceptedPlanId })
  return response.data.data
}

async function cancelOrder(orderId: string): Promise<string> {
  const response = await apiClient.patch<ApiResponse<string>>(`/v1/orders/${orderId}/cancellation`)
  return response.data.data
}

/**
 * Mở một phiên thanh toán ở cổng.
 *
 * Gọi ĐÚNG LÚC người dùng bấm trả, không bao giờ khi tải trang: SePay không có API hủy phiên chưa
 * trả, nên một phiên bị bỏ dở làm CancelOrderUseCase từ chối hủy, và ràng buộc mỗi trường một đơn
 * đăng ký mở khoá trường khỏi đặt đơn mới cho tới khi đơn tự hết hạn (tối đa 24 giờ).
 */
async function createCheckoutUrl(input: { orderId: string; provider: PaymentMethod }): Promise<PaymentLink> {
  const response = await apiClient.post<ApiResponse<PaymentLink>>('/v1/payments/checkout-url', {
    orderId: input.orderId,
    provider: input.provider,
  })
  return response.data.data
}

export function usePlaceSubscriptionOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: placeSubscriptionOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all })
    },
  })
}

export function usePlaceRenewalOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: placeRenewalOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all })
    },
  })
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all })
    },
  })
}

export function useCreateCheckoutUrlMutation() {
  return useMutation({
    mutationFn: createCheckoutUrl,
  })
}
