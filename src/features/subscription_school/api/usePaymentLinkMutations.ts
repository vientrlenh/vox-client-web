import { useMutation } from '@tanstack/react-query'
import { apiClient, graphQLRequest } from '@/shared/api'
import type { MutationResult, RenewalPreview } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

// KHÔNG nhận tham số: gói cần gia hạn là gói gần nhất của chính trường đang đăng nhập, suy từ token
// -- xem schoolSubscriptionRenewalPreview ở BE.
const RENEWAL_PREVIEW_QUERY = `
  query SchoolSubscriptionRenewalPreview {
    schoolSubscriptionRenewalPreview {
      planChanged
      startsAt
      amountDue
      currentPlan {
        id
        name
        tagline
        priceVnd
        periodType
        periodCount
        maxTimePerAttemptMin
        status
        replacedByPlanId
        quotas {
          id
          quotaType
          includedAmountVnd
        }
      }
      renewalPlan {
        id
        name
        tagline
        priceVnd
        periodType
        periodCount
        maxTimePerAttemptMin
        status
        replacedByPlanId
        quotas {
          id
          quotaType
          includedAmountVnd
        }
      }
    }
  }
`

async function previewRenewal(): Promise<RenewalPreview> {
  const data = await graphQLRequest<{ schoolSubscriptionRenewalPreview: RenewalPreview }>(RENEWAL_PREVIEW_QUERY)
  return data.schoolSubscriptionRenewalPreview
}

export type CreateRenewalOrderPayload = {
  acceptedPlanId: string
}

/**
 * Đặt đơn gia hạn -- acceptedPlanId PHẢI là renewalPlan.id lấy từ previewRenewal() gọi trước đó
 * (gói đang dùng có thể đã ARCHIVED và được gán gói thay thế, trường phải nhìn thấy và đồng ý
 * trước khi đặt đơn). Trả về id đơn PENDING, bước tiếp theo là useCreatePaymentCheckoutMutation.
 */
async function createRenewalOrder(payload: CreateRenewalOrderPayload): Promise<MutationResult<string>> {
  const response = await apiClient.post<ApiResponse<string>>('/v1/orders/renewal', payload)
  return response.data
}

export type CreateTopUpOrderPayload = {
  creditAmountVnd: number
}

/**
 * Đặt đơn nạp thêm số dư -- creditAmountVnd là số dư trường MUỐN NHẬN vào SchoolBalance chung,
 * CHƯA gồm phí dịch vụ. Không tách theo từng loại quota: ví tự nạp của trường là một ví DUY NHẤT,
 * dùng chung cho mọi lượt vượt hạn mức EXAM lẫn PRACTICE.
 */
async function createTopUpOrder(payload: CreateTopUpOrderPayload): Promise<MutationResult<string>> {
  const response = await apiClient.post<ApiResponse<string>>('/v1/orders/topup', payload)
  return response.data
}

export function usePreviewRenewalMutation() {
  return useMutation({
    mutationFn: previewRenewal,
  })
}

export function useCreateRenewalOrderMutation() {
  return useMutation({
    mutationFn: createRenewalOrder,
  })
}

export function useCreateTopUpOrderMutation() {
  return useMutation({
    mutationFn: createTopUpOrder,
  })
}
