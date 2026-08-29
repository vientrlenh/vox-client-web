import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { mySubscriptionQueryKeys } from './useMySubscriptionQuery'

type ApiResponse<TData> = {
  data: TData
  message: string
}

/**
 * Trường báo sẽ KHÔNG mua tiếp sau khi kỳ hiện tại kết thúc.
 *
 * Không cắt quyền dùng và không hoàn tiền — gói vẫn chạy tới hết endDate, chỉ là không tự gia hạn.
 * Khác hẳn đình chỉ, thứ cắt quyền ngay và chỉ System Admin làm được.
 *
 * KHÔNG nhận id nào: kỳ đang chạy suy ra từ token. Đường cũ
 * POST /v1/schools/{schoolId}/subscriptions/{id}/cancel đã bị bỏ — nhận schoolId từ đường dẫn thì
 * hasRole('SCHOOL_ADMIN') chỉ trả lời "có phải school admin không", không trả lời "của trường NÀY".
 */
async function cancelMySubscription(): Promise<string> {
  const response = await apiClient.patch<ApiResponse<string>>('/v1/subscriptions/cancellation')
  return response.data.data
}

export function useCancelMySubscriptionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelMySubscription,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mySubscriptionQueryKeys.all })
    },
  })
}
