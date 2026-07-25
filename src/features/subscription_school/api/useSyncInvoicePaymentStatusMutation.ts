import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { Invoice, MutationResult } from '../types'

// FE gọi khi PayOS redirect user về returnUrl/cancelUrl — PayOS không luôn gọi webhook cho
// trường hợp user tự hủy/đóng tab trên checkout UI, nên phải chủ động đối soát trạng thái thật
// (BE tự hỏi lại PayOS qua orderCode) thay vì đoán từ query param trên URL redirect.
async function syncInvoicePaymentStatus(orderCode: number): Promise<MutationResult<Invoice>> {
  const response = await apiClient.post<MutationResult<Invoice>>(`/v1/invoices/${orderCode}/sync-status`)
  return response.data
}

export function useSyncInvoicePaymentStatusMutation() {
  return useMutation({
    mutationFn: syncInvoicePaymentStatus,
  })
}
