import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { Invoice, MutationResult } from '../types'

// FE gọi khi cổng thanh toán redirect user quay về — cổng không luôn gọi webhook cho trường hợp
// user tự hủy/đóng tab trên checkout UI, nên phải chủ động đối soát trạng thái thật (BE tự hỏi lại
// đúng cổng đã tạo hóa đơn) thay vì đoán từ query param trên URL redirect.
//
// Định danh bằng invoiceId chứ không phải mã đơn phía cổng: mã đơn chỉ duy nhất trong phạm vi một
// cổng nên khi hệ thống có nhiều cổng thì một mình nó không tra ngược ra hóa đơn được.
async function syncInvoicePaymentStatus(invoiceId: string): Promise<MutationResult<Invoice>> {
  const response = await apiClient.post<MutationResult<Invoice>>(`/v1/invoices/${invoiceId}/sync-status`)
  return response.data
}

export function useSyncInvoicePaymentStatusMutation() {
  return useMutation({
    mutationFn: syncInvoicePaymentStatus,
  })
}
