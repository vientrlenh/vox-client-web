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

  if (config.data instanceof FormData) {
    // Bo header Content-Type mac dinh 'application/json' cua instance de axios/trinh duyet
    // tu tinh lai 'multipart/form-data; boundary=...' dung cho FormData - neu giu nguyen header
    // cu thi boundary se khong duoc gan, BE nhan dung Content-Type 'application/json' va tu choi
    // parse file (loi "Content-Type 'application/json' is not supported").
    config.headers.delete('Content-Type')
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
