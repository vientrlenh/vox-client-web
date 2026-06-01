import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { ApiResponse, SendResetPasswordOtpRequest } from '../types'

export async function sendResetPasswordOtp(
  payload: SendResetPasswordOtpRequest,
) {
  const response = await apiClient.post<ApiResponse<null>>(
    '/v1/auth/reset-password-otp',
    payload,
  )

  return response.data.message
}

export function useSendResetPasswordOtpMutation() {
  return useMutation({
    mutationFn: sendResetPasswordOtp,
  })
}
