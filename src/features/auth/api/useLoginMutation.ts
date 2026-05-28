import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { ApiResponse, LoginRequest, LoginResponse } from '../types'

export async function login(payload: LoginRequest) {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    '/v1/auth/login',
    payload,
  )

  return response.data.data
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
  })
}
