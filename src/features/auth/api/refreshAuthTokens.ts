import { apiClient } from '@/shared/api'
import { getClientDevice } from '../session/authSession'
import type { ApiResponse, RefreshRequest, RefreshResponse } from '../types'

export async function refreshAuthTokens(refreshToken: string) {
  const payload: RefreshRequest = {
    deviceId: getClientDevice().deviceId,
    token: refreshToken,
  }

  const response = await apiClient.post<ApiResponse<RefreshResponse>>(
    '/v1/auth/refresh',
    payload,
  )

  return response.data.data
}
