import { useMutation } from '@tanstack/react-query'
import { apiClient, requireSchoolId } from '@/shared/api'
import type { MutationResult, PaymentLink, QuotaType } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

export type BuyTokensPayload = {
  subscriptionId: string
  items: { quotaType: QuotaType; quantity: number }[]
}

async function createPaymentLinkForRenewal(subscriptionId: string): Promise<MutationResult<PaymentLink>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<ApiResponse<PaymentLink>>(
    `/v1/schools/${schoolId}/subscriptions/${subscriptionId}/renew/payment-link`,
  )
  return response.data
}

async function createPaymentLinkForTokenPurchase(payload: BuyTokensPayload): Promise<MutationResult<PaymentLink>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<ApiResponse<PaymentLink>>(
    `/v1/schools/${schoolId}/token-purchases/payment-link`,
    payload,
  )
  return response.data
}

export function useCreatePaymentLinkForRenewalMutation() {
  return useMutation({
    mutationFn: createPaymentLinkForRenewal,
  })
}

export function useCreatePaymentLinkForTokenPurchaseMutation() {
  return useMutation({
    mutationFn: createPaymentLinkForTokenPurchase,
  })
}
