import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { VerifyRegistrationRequest } from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

export async function verifyRegistration(payload: VerifyRegistrationRequest) {
  const response = await apiClient.post<ApiResponse<null>>(
    '/v1/auth/verify-registration',
    payload,
  )

  return response.data.message
}

export function useVerifyRegistrationMutation() {
  return useMutation({
    mutationFn: verifyRegistration,
  })
}
