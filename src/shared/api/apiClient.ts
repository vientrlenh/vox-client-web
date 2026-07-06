import axios from 'axios'
import { appConfig } from '@/shared/config/env'
import { getAuthTokens } from './authTokenStorage'
import { createRawErrorInterceptorInstaller } from './rawErrorInterceptor'

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl, 
  withCredentials: true
})

apiClient.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.setContentType(false)
  }

  const tokens = getAuthTokens()

  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`
  }

  return config
})

export const addApiClientRawErrorInterceptor = createRawErrorInterceptorInstaller(apiClient)
