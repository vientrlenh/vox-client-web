import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { getClientDevice } from '../session/authSession'
import type {
  ApiResponse,
  LoginCredentials,
  LoginRequest,
  LoginResponse,
} from '../types'

export async function login(credentials: LoginCredentials) {
  const payload: LoginRequest = {
    ...credentials,
    device: getClientDevice(),
  }

  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    '/v1/auth/login',
    payload,
  )

  return response.data.data
}

export function useLoginMutation() {
  return useMutation<LoginResponse, unknown, LoginCredentials>({
    mutationFn: login,
  })
}
