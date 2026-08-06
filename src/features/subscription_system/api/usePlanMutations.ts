import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, graphQLRequest } from '@/shared/api'
import { subscriptionPlanQueryKeys } from './useSubscriptionPlansQuery'
import type { CreatePlanPayload, MutationResult, SubscriptionPlan, UpdatePlanPayload } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

const UPDATE_SUBSCRIPTION_PLAN_MUTATION = `
  mutation UpdateSubscriptionPlan($id: ID!, $input: UpdateSubscriptionPlanInput!) {
    updateSubscriptionPlan(id: $id, input: $input) {
      id
    }
  }
`

async function createPlan(payload: CreatePlanPayload): Promise<MutationResult<SubscriptionPlan>> {
  const response = await apiClient.post<ApiResponse<SubscriptionPlan>>('/v1/plans', payload)
  return response.data
}

async function archivePlan({
  id,
  replacedByPlanId,
}: {
  id: string
  replacedByPlanId: string | null
}): Promise<MutationResult<SubscriptionPlan>> {
  const response = await apiClient.delete<ApiResponse<SubscriptionPlan>>(`/v1/plans/${id}`, {
    params: replacedByPlanId ? { replacedByPlanId } : undefined,
  })
  return response.data
}

async function updatePlan(id: string, payload: UpdatePlanPayload): Promise<string> {
  const data = await graphQLRequest<{ updateSubscriptionPlan: { id: string } }>(
    UPDATE_SUBSCRIPTION_PLAN_MUTATION,
    { id, input: payload },
  )

  return data.updateSubscriptionPlan.id
}

export function useCreatePlanMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionPlanQueryKeys.all })
    },
  })
}

export function useUpdatePlanMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePlanPayload }) => updatePlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionPlanQueryKeys.all })
    },
  })
}

export function useArchivePlanMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: archivePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionPlanQueryKeys.all })
    },
  })
}
