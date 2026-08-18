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

type SuspendSubscriptionInput = SubscriptionActionInput & {
  reason: string
}

type UnsuspendSubscriptionInput = SubscriptionActionInput & {
  note?: string
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

async function suspendSubscription({ schoolId, subscriptionId, reason }: SuspendSubscriptionInput): Promise<
  MutationResult<SchoolSubscription>
> {
  const response = await apiClient.post<ApiResponse<SchoolSubscription>>(
    `/v1/schools/${schoolId}/subscriptions/${subscriptionId}/suspend`,
    { reason },
  )
  return response.data
}

async function unsuspendSubscription({ schoolId, subscriptionId, note }: UnsuspendSubscriptionInput): Promise<
  MutationResult<SchoolSubscription>
> {
  const response = await apiClient.post<ApiResponse<SchoolSubscription>>(
    `/v1/schools/${schoolId}/subscriptions/${subscriptionId}/unsuspend`,
    { note },
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

export function useSuspendSubscriptionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: suspendSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolSubscriptionQueryKeys.all })
    },
  })
}

export function useUnsuspendSubscriptionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: unsuspendSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolSubscriptionQueryKeys.all })
    },
  })
}
