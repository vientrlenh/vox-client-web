import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { schoolSubscriptionQueryKeys } from './useSchoolSubscriptionsQuery'
import type { MutationResult } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

/**
 * Đình chỉ / gỡ đình chỉ nhận ĐÚNG id gói đăng ký, không kèm schoolId — trường suy ra từ chính gói ở
 * BE. Đường cũ /v1/schools/{schoolId}/subscriptions/{id}/suspend đã bị bỏ.
 *
 * KHÔNG có hành động hủy ở đây: PATCH /v1/subscriptions/cancellation là của SCHOOL_ADMIN và lấy
 * trường từ token, nên System Admin không hủy gia hạn hộ trường được.
 */
async function suspendSubscription({
  reason,
  subscriptionId,
}: {
  reason: string
  subscriptionId: string
}): Promise<MutationResult<string>> {
  const response = await apiClient.patch<ApiResponse<string>>(
    `/v1/subscriptions/${subscriptionId}/suspension`,
    { reason },
  )
  return response.data
}

async function unsuspendSubscription({
  note,
  subscriptionId,
}: {
  note?: string
  subscriptionId: string
}): Promise<MutationResult<string>> {
  // DELETE có body: gỡ đình chỉ xóa trắng ba cột suspended_*, nên ghi chú là thứ duy nhất còn lại
  // giải thích vì sao gỡ. axios đưa body của DELETE qua `data`.
  const response = await apiClient.delete<ApiResponse<string>>(
    `/v1/subscriptions/${subscriptionId}/suspension`,
    { data: { note: note ?? null } },
  )
  return response.data
}

function useSubscriptionMutation<TInput, TOutput>(mutationFn: (input: TInput) => Promise<TOutput>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolSubscriptionQueryKeys.all })
    },
  })
}

export function useSuspendSubscriptionMutation() {
  return useSubscriptionMutation(suspendSubscription)
}

export function useUnsuspendSubscriptionMutation() {
  return useSubscriptionMutation(unsuspendSubscription)
}
