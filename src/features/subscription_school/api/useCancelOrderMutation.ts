import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { myOrdersQueryKeys } from './useMyOrdersQuery'
import type { MutationResult } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

// Chỉ hủy được đơn còn PENDING -- xem CancelOrderUseCase (BE). Có thể thất bại dù đơn còn PENDING nếu
// phiên thanh toán đang sống ở cổng không cho hủy sớm (SePay), khi đó phải đợi expiresAt tự hết hạn.
async function cancelOrder(orderId: string): Promise<MutationResult<string>> {
  const response = await apiClient.patch<ApiResponse<string>>(`/v1/orders/${orderId}/cancellation`)
  return response.data
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myOrdersQueryKeys.all })
    },
  })
}
