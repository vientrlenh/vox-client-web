import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { ApiResponse, SetUpPasswordRequest } from '../types'

export async function setUpPassword(payload: SetUpPasswordRequest) {
  const response = await apiClient.post<ApiResponse<null>>(
    '/v1/auth/setup-password',
    payload,
  )

  return response.data.message
}

export function useSetUpPasswordMutation() {
  return useMutation({
    mutationFn: setUpPassword,
  })
}
