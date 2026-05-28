import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { ApiResponse, RegisterRequest } from '../types'

export async function register(payload: RegisterRequest) {
  const response = await apiClient.post<ApiResponse<null>>(
    '/v1/auth/register',
    payload,
  )

  return response.data.message
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: register,
  })
}
