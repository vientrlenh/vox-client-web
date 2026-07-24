import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { subscriptionRequestQueryKeys } from './useSubscriptionRequestsQuery'
import { schoolSubscriptionQueryKeys } from './useSchoolSubscriptionsQuery'
import type { MutationResult, SubscriptionRequest } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

async function approveRequest(id: string): Promise<MutationResult<SubscriptionRequest>> {
  const response = await apiClient.post<ApiResponse<SubscriptionRequest>>(
    `/v1/subscription-requests/${id}/approve`,
  )
  return response.data
}

async function rejectRequest(id: string): Promise<MutationResult<SubscriptionRequest>> {
  const response = await apiClient.post<ApiResponse<SubscriptionRequest>>(
    `/v1/subscription-requests/${id}/reject`,
  )
  return response.data
}

export function useApproveRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: approveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionRequestQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: schoolSubscriptionQueryKeys.all })
    },
  })
}

export function useRejectRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rejectRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionRequestQueryKeys.all })
    },
  })
}
