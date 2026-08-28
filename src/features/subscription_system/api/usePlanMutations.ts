import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, graphQLRequest } from '@/shared/api'
import { subscriptionPlanQueryKeys } from './useSubscriptionPlansQuery'
import type { CreateSubscriptionPlanPayload, MutationResult, UpdateSubscriptionPlanPayload } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

// KHÔNG có selection set: updateSubscriptionPlan trả về ID! (scalar), không còn trả cả SubscriptionPlan
// như trước. Thêm `{ id }` vào đây là lỗi validate ở tầng GraphQL, không phải lỗi lúc chạy.
const UPDATE_SUBSCRIPTION_PLAN_MUTATION = `
  mutation UpdateSubscriptionPlan($id: ID!, $input: UpdateSubscriptionPlanInput!) {
    updateSubscriptionPlan(id: $id, input: $input)
  }
`

async function createPlan(payload: CreateSubscriptionPlanPayload): Promise<MutationResult<string>> {
  const response = await apiClient.post<ApiResponse<string>>('/v1/subscriptions', payload)
  return response.data
}

async function updatePlan(id: string, payload: UpdateSubscriptionPlanPayload): Promise<string> {
  const data = await graphQLRequest<{ updateSubscriptionPlan: string }>(
    UPDATE_SUBSCRIPTION_PLAN_MUTATION,
    { id, input: payload },
  )

  return data.updateSubscriptionPlan
}

// replacedByPlanId là TÙY CHỌN ở đây: ngừng bán một gói chưa trường nào dùng thì không cần gói thay
// thế. Đổi gói thay thế về sau đi qua updatePlanReplacement.
async function archivePlan({
  id,
  replacedByPlanId,
}: {
  id: string
  replacedByPlanId: string | null
}): Promise<MutationResult<string>> {
  const response = await apiClient.delete<ApiResponse<string>>(`/v1/subscriptions/${id}`, {
    params: replacedByPlanId ? { replacedByPlanId } : undefined,
  })
  return response.data
}

async function updatePlanReplacement({
  id,
  replacedByPlanId,
}: {
  id: string
  replacedByPlanId: string
}): Promise<MutationResult<string>> {
  const response = await apiClient.patch<ApiResponse<string>>(
    `/v1/subscriptions/${id}/replacement`,
    null,
    { params: { replacedByPlanId } },
  )
  return response.data
}

async function publishPlan(id: string): Promise<MutationResult<string>> {
  const response = await apiClient.patch<ApiResponse<string>>(`/v1/subscriptions/${id}/publish`)
  return response.data
}

async function deleteDraftPlan(id: string): Promise<void> {
  await apiClient.delete(`/v1/subscriptions/${id}/draft`)
}

function usePlanMutation<TInput, TOutput>(mutationFn: (input: TInput) => Promise<TOutput>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionPlanQueryKeys.all })
    },
  })
}

export function useCreatePlanMutation() {
  return usePlanMutation(createPlan)
}

export function useUpdatePlanMutation() {
  return usePlanMutation(({ id, payload }: { id: string; payload: UpdateSubscriptionPlanPayload }) =>
    updatePlan(id, payload),
  )
}

export function useArchivePlanMutation() {
  return usePlanMutation(archivePlan)
}

export function useUpdatePlanReplacementMutation() {
  return usePlanMutation(updatePlanReplacement)
}

export function usePublishPlanMutation() {
  return usePlanMutation(publishPlan)
}

export function useDeleteDraftPlanMutation() {
  return usePlanMutation(deleteDraftPlan)
}
