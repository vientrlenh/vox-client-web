import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  ApproveRegisterFormRequest,
  RejectRegisterFormRequest,
} from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

type ApproveRegisterFormInput = {
  id: string
  payload: ApproveRegisterFormRequest
}

type RejectRegisterFormInput = {
  id: string
  payload: RejectRegisterFormRequest
}

export async function approveRegisterForm({
  id,
  payload,
}: ApproveRegisterFormInput) {
  const response = await apiClient.post<ApiResponse<null>>(
    `/v1/register-forms/${id}/approve`,
    payload,
  )

  return response.data.message
}

export async function rejectRegisterForm({
  id,
  payload,
}: RejectRegisterFormInput) {
  const response = await apiClient.post<ApiResponse<null>>(
    `/v1/register-forms/${id}/reject`,
    payload,
  )

  return response.data.message
}

export function useApproveRegisterFormMutation() {
  return useMutation({
    mutationFn: approveRegisterForm,
  })
}

export function useRejectRegisterFormMutation() {
  return useMutation({
    mutationFn: rejectRegisterForm,
  })
}
