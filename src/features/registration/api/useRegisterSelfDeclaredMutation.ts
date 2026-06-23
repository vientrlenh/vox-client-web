import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { RegisterSelfDeclaredRequest } from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

export async function registerSelfDeclared(
  payload: RegisterSelfDeclaredRequest,
) {
  const response = await apiClient.post<ApiResponse<null>>(
    '/v1/auth/register-self-declared',
    payload,
  )

  return response.data.message
}

export function useRegisterSelfDeclaredMutation() {
  return useMutation({
    mutationFn: registerSelfDeclared,
  })
}
