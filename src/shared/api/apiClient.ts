import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import { appConfig } from '@/shared/config/env'
import { getAuthTokens } from './authTokenStorage'
import { toApiError } from './apiError'

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const tokens = getAuthTokens()

  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`
  }

  return config
})

let apiErrorInterceptorId = apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)

export function addApiClientRawErrorInterceptor(
  onRejected: (error: AxiosError) => Promise<AxiosResponse>,
) {
  apiClient.interceptors.response.eject(apiErrorInterceptorId)

  const interceptorId = apiClient.interceptors.response.use(
    (response) => response,
    onRejected,
  )

  apiErrorInterceptorId = apiClient.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(toApiError(error)),
  )

  return () => {
    apiClient.interceptors.response.eject(interceptorId)
  }
}
