import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { ApiResponse, ResetPasswordRequest } from '../types'

export async function resetPassword(payload: ResetPasswordRequest) {
  const response = await apiClient.patch<ApiResponse<null>>(
    '/v1/auth/reset-password',
    payload,
  )

  return response.data.message
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: resetPassword,
  })
}
