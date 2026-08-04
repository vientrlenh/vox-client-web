import { useMutation } from '@tanstack/react-query'
import { apiClient, requireSchoolId } from '@/shared/api'
import type { MutationResult, PaymentLink, QuotaType, RenewalPreview } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

export type BuyTokensPayload = {
  subscriptionId: string
  items: { quotaType: QuotaType; quantity: number }[]
}

export type CreatePaymentLinkForRenewalPayload = {
  subscriptionId: string
  acceptedPlanId?: string
}

async function previewRenewal(subscriptionId: string): Promise<MutationResult<RenewalPreview>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.get<ApiResponse<RenewalPreview>>(
    `/v1/schools/${schoolId}/subscriptions/${subscriptionId}/renewal-preview`,
  )
  return response.data
}

async function createPaymentLinkForRenewal({
  subscriptionId,
  acceptedPlanId,
}: CreatePaymentLinkForRenewalPayload): Promise<MutationResult<PaymentLink>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<ApiResponse<PaymentLink>>(
    `/v1/schools/${schoolId}/subscriptions/${subscriptionId}/renew/payment-link`,
    undefined,
    { params: acceptedPlanId ? { acceptedPlanId } : undefined },
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

export function usePreviewRenewalMutation() {
  return useMutation({
    mutationFn: previewRenewal,
  })
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
