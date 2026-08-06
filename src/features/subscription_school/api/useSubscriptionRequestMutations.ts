import { useMutation } from '@tanstack/react-query'
import { apiClient, requireSchoolId } from '@/shared/api'
import type { MutationResult, PaymentLink, PaymentMethod, RequestType } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

type SubscriptionRequestDto = {
  id: string
  schoolId: string
  requestType: RequestType
  currentPlanId: string | null
  requestedPlanId: string
  amount: number
  status: string
}

export type SubmitSubscriptionRequestPayload = {
  currentPlanId?: string | null
  requestedPlanId: string
  requestType: RequestType
}

async function submitSubscriptionRequest(
  payload: SubmitSubscriptionRequestPayload,
): Promise<MutationResult<SubscriptionRequestDto>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<ApiResponse<SubscriptionRequestDto>>(
    `/v1/schools/${schoolId}/subscription-requests`,
    payload,
  )
  return response.data
}

export type CreatePaymentLinkForRequestPayload = {
  paymentMethod: PaymentMethod
  requestId: string
}

async function createPaymentLinkForSubscriptionRequest({
  paymentMethod,
  requestId,
}: CreatePaymentLinkForRequestPayload): Promise<MutationResult<PaymentLink>> {
  const response = await apiClient.post<ApiResponse<PaymentLink>>(
    `/v1/subscription-requests/${requestId}/payment-link`,
    { paymentMethod },
  )
  return response.data
}

export function useSubmitSubscriptionRequestMutation() {
  return useMutation({
    mutationFn: submitSubscriptionRequest,
  })
}

export function useCreatePaymentLinkForSubscriptionRequestMutation() {
  return useMutation({
    mutationFn: createPaymentLinkForSubscriptionRequest,
  })
}
