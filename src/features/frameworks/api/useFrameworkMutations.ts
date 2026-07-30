import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  CreateFrameworkRequest,
  CreateFrameworkResponse,
  DeleteFrameworkResponse,
  MutationResult,
  UpdateFrameworkRequest,
  UpdateFrameworkResponse,
} from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

type CreateFrameworkInput = {
  payload: CreateFrameworkRequest
}

type UpdateFrameworkInput = {
  id: string
  payload: UpdateFrameworkRequest
}

type DeleteFrameworkInput = {
  id: string
}

type SetFrameworkActiveInput = {
  id: string
}

type SetFrameworkActiveResponse = {
  frameworkId: string
}

export async function createFramework({
  payload,
}: CreateFrameworkInput): Promise<MutationResult<CreateFrameworkResponse>> {
  const response = await apiClient.post<ApiResponse<CreateFrameworkResponse>>(
    '/v1/frameworks',
    payload,
  )

  return response.data
}

export async function updateFramework({
  id,
  payload,
}: UpdateFrameworkInput): Promise<MutationResult<UpdateFrameworkResponse>> {
  const response = await apiClient.patch<ApiResponse<UpdateFrameworkResponse>>(
    `/v1/frameworks/${id}`,
    payload,
  )

  return response.data
}

export async function deleteFramework({
  id,
}: DeleteFrameworkInput): Promise<MutationResult<DeleteFrameworkResponse>> {
  const response = await apiClient.delete<ApiResponse<DeleteFrameworkResponse>>(
    `/v1/frameworks/${id}`,
  )

  return response.data
}

export function useCreateFrameworkMutation() {
  return useMutation({
    mutationFn: createFramework,
  })
}

export function useUpdateFrameworkMutation() {
  return useMutation({
    mutationFn: updateFramework,
  })
}

export function useDeleteFrameworkMutation() {
  return useMutation({
    mutationFn: deleteFramework,
  })
}

// --- REST: activate/deactivate (the only way to change isActive now) ---

export async function activateFramework({
  id,
}: SetFrameworkActiveInput): Promise<
  MutationResult<SetFrameworkActiveResponse>
> {
  const response = await apiClient.patch<
    ApiResponse<SetFrameworkActiveResponse>
  >(`/v1/frameworks/${id}/activate`)

  return response.data
}

export async function deactivateFramework({
  id,
}: SetFrameworkActiveInput): Promise<
  MutationResult<SetFrameworkActiveResponse>
> {
  const response = await apiClient.patch<
    ApiResponse<SetFrameworkActiveResponse>
  >(`/v1/frameworks/${id}/deactivate`)

  return response.data
}

export function useActivateFrameworkMutation() {
  return useMutation({
    mutationFn: activateFramework,
  })
}

export function useDeactivateFrameworkMutation() {
  return useMutation({
    mutationFn: deactivateFramework,
  })
}
