import axios from 'axios'
import type {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { clearAuthState, setAuthenticatedUser } from '@/app/store/authSlice'
import type { AppStore } from '@/app/store/store'
import { addApiClientRawErrorInterceptor, apiClient } from '@/shared/api'
import { refreshAuthTokens } from '../api/refreshAuthTokens'
import type { RefreshResponse } from '../types'
import {
  clearAuthTokens,
  decodeAccessToken,
  getAuthTokens,
  isAccessTokenExpired,
  saveAuthTokens,
} from './authSession'

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean
}

let uninstallRefreshInterceptor: (() => void) | null = null
let refreshPromise: Promise<RefreshResponse> | null = null

function isAuthEndpoint(url: string | undefined) {
  return url === '/v1/auth/login' || url === '/v1/auth/refresh'
}

function updateAuthorizationHeader(
  config: AxiosRequestConfig,
  accessToken: string,
) {
  config.headers = {
    ...config.headers,
    Authorization: `Bearer ${accessToken}`,
  }
}

function clearSession(store: AppStore) {
  clearAuthTokens()
  store.dispatch(clearAuthState())
}

async function refreshAndRetry(
  error: AxiosError,
  store: AppStore,
): Promise<AxiosResponse> {
  const config = error.config as RetriableRequestConfig | undefined

  if (
    error.response?.status !== 401 ||
    !config ||
    config._authRetry ||
    isAuthEndpoint(config.url)
  ) {
    return Promise.reject(error)
  }

  const tokens = getAuthTokens()

  if (!tokens) {
    clearSession(store)
    return Promise.reject(error)
  }

  config._authRetry = true

  try {
    if (!refreshPromise) {
      refreshPromise = refreshAuthTokens(tokens.refreshToken).finally(() => {
        refreshPromise = null
      })
    }

    const newTokens = await refreshPromise
    const user = decodeAccessToken(newTokens.accessToken)

    if (!user || isAccessTokenExpired(user)) {
      clearSession(store)
      return Promise.reject(error)
    }

    saveAuthTokens(newTokens)
    store.dispatch(setAuthenticatedUser(user))
    updateAuthorizationHeader(config, newTokens.accessToken)

    return apiClient(config)
  } catch (refreshError) {
    clearSession(store)
    return Promise.reject(refreshError)
  }
}

export function installAuthRefreshInterceptor(store: AppStore) {
  if (uninstallRefreshInterceptor) {
    return uninstallRefreshInterceptor
  }

  const uninstall = addApiClientRawErrorInterceptor((error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error)
    }

    return refreshAndRetry(error, store)
  })

  uninstallRefreshInterceptor = () => {
    uninstall()
    uninstallRefreshInterceptor = null
  }

  return uninstallRefreshInterceptor
}
