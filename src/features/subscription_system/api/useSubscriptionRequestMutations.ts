import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { subscriptionRequestQueryKeys } from './useSubscriptionRequestsQuery'
import type { MutationResult, PaymentLink, PaymentMethod, SubscriptionRequest } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

async function rejectRequest(id: string): Promise<MutationResult<SubscriptionRequest>> {
  const response = await apiClient.post<ApiResponse<SubscriptionRequest>>(
    `/v1/subscription-requests/${id}/reject`,
  )
  return response.data
}

export type CreatePaymentLinkForRequestPayload = {
  paymentMethod: PaymentMethod
  requestId: string
}

// System Admin duyệt request bằng cách thanh toán qua cổng, giống hệt luồng School Admin — request
// chỉ được kích hoạt sau khi cổng xác nhận thanh toán (qua webhook hoặc sync-status), không có
// đường tắt approve-free nữa.
async function createPaymentLinkForRequest({
  paymentMethod,
  requestId,
}: CreatePaymentLinkForRequestPayload): Promise<MutationResult<PaymentLink>> {
  const response = await apiClient.post<ApiResponse<PaymentLink>>(
    `/v1/subscription-requests/${requestId}/payment-link`,
    { paymentMethod },
  )
  return response.data
}

export function useRejectRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rejectRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionRequestQueryKeys.all })
    },
  })
}

export function useCreatePaymentLinkForRequestMutation() {
  return useMutation({
    mutationFn: createPaymentLinkForRequest,
  })
}
