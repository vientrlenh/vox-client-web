import axios from 'axios'
import { appConfig } from '@/shared/config/env'
import { toApiError } from './apiError'

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)
