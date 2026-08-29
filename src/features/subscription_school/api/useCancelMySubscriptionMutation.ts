import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { mySubscriptionQueryKeys } from './useMySubscriptionQuery'
import type { MutationResult } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

// Không nhận id/body: kỳ đang chạy của trường suy ra từ token, xem CancelSchoolSubscriptionUseCase
// ở BE. Chỉ ghi nhận "không gia hạn tiếp" (cancelledAt) -- không cắt quyền dùng, không hoàn tiền.
async function cancelMySubscription(): Promise<MutationResult<string>> {
  const response = await apiClient.patch<ApiResponse<string>>('/v1/subscriptions/cancellation')
  return response.data
}

export function useCancelMySubscriptionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelMySubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mySubscriptionQueryKeys.all })
    },
  })
}
