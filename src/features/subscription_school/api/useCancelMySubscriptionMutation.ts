import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, requireSchoolId } from '@/shared/api'
import { mySubscriptionQueryKeys } from './useMySubscriptionQuery'
import type { MutationResult, MySubscription } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

async function cancelMySubscription(subscriptionId: string): Promise<MutationResult<MySubscription>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<ApiResponse<MySubscription>>(
    `/v1/schools/${schoolId}/subscriptions/${subscriptionId}/cancel`,
  )
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
