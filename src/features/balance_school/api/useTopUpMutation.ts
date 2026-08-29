import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { balanceQueryKeys } from './useBalanceQueries'

type ApiResponse<TData> = {
  data: TData
  message: string
}

/**
 * Đặt đơn nạp thêm vào ví. Ghi bằng REST, đọc bằng GraphQL -- đúng quy ước chung của dự án.
 *
 * creditAmountVnd là số tiền VÍ NHẬN ĐƯỢC, không phải số phải trả: phí dịch vụ cộng THÊM ở trên.
 * Số nguyên đồng, backend từ chối phần thập phân.
 *
 * Trả về orderId và KHÔNG mở phiên thanh toán -- phiên chỉ được phát đúng lúc người dùng bấm trả
 * trên trang đơn, vì SePay không có API hủy phiên chưa trả.
 */
async function placeTopUpOrder(creditAmountVnd: number): Promise<string> {
  const response = await apiClient.post<ApiResponse<string>>('/v1/orders/topup', { creditAmountVnd })
  return response.data.data
}

export function usePlaceTopUpOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: placeTopUpOrder,
    onSuccess: () => {
      // Ví chưa đổi (đơn còn chờ thanh toán) nhưng lịch sử đơn thì có -- và người dùng sắp rời sang
      // trang đơn, nên làm mới ở đây để trang đó không phải đợi thêm một vòng.
      void queryClient.invalidateQueries({ queryKey: balanceQueryKeys.all })
    },
  })
}
