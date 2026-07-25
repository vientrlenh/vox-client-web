import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { schoolSubscriptionQueryKeys } from './useSchoolSubscriptionsQuery'
import type { MutationResult, SchoolSubscription } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

type SubscriptionActionInput = {
  schoolId: string
  subscriptionId: string
}

async function renewSubscription({ schoolId, subscriptionId }: SubscriptionActionInput): Promise<
  MutationResult<SchoolSubscription>
> {
  const response = await apiClient.post<ApiResponse<SchoolSubscription>>(
    `/v1/schools/${schoolId}/subscriptions/${subscriptionId}/renew`,
  )
  return response.data
}

async function cancelSubscription({ schoolId, subscriptionId }: SubscriptionActionInput): Promise<
  MutationResult<SchoolSubscription>
> {
  const response = await apiClient.post<ApiResponse<SchoolSubscription>>(
    `/v1/schools/${schoolId}/subscriptions/${subscriptionId}/cancel`,
  )
  return response.data
}

export function useRenewSubscriptionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: renewSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolSubscriptionQueryKeys.all })
    },
  })
}

export function useCancelSubscriptionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolSubscriptionQueryKeys.all })
    },
  })
}
