import axios from 'axios'
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { clearAuthState, setAuthenticatedUser } from '@/app/store/authSlice'
import type { AppStore } from '@/app/store/store'
import { addApiClientRawErrorInterceptor, addGraphqlClientRawErrorInterceptor, apiClient, graphqlApiClient } from '@/shared/api'
import {
  clearAuthTokens,
  decodeAccessToken,
  getAuthTokens,
  isAccessTokenExpired,
  saveAuthTokens,
} from './authSession'
import { refreshSessionOnce } from './sessionRefresh'

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean
}

let uninstallRefreshInterceptor: (() => void) | null = null

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
  client: AxiosInstance,
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
    // Gộp lời gọi trong tab và xếp hàng giữa các tab đều nằm trong refreshSessionOnce -- xem lý do
    // ở đó, nó không phải tối ưu hoá mà là thứ giữ cho phiên không bị thu hồi oan.
    const accessToken = await refreshSessionOnce()
    const user = decodeAccessToken(accessToken)

    if (!user || isAccessTokenExpired(user)) {
      clearSession(store)
      return Promise.reject(error)
    }

    saveAuthTokens({ accessToken })
    store.dispatch(setAuthenticatedUser(user))
    updateAuthorizationHeader(config, accessToken)

    return client(config)
  } catch (refreshError) {
    clearSession(store)
    return Promise.reject(refreshError)
  }
}

function createRefreshErrorHandler(client: AxiosInstance, store: AppStore) {
  return (error: AxiosError) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error)
    }
    return refreshAndRetry(client, error, store)
  }
}

export function installAuthRefreshInterceptor(store: AppStore) {
  if (uninstallRefreshInterceptor) {
    return uninstallRefreshInterceptor
  }

  const uninstallApi = addApiClientRawErrorInterceptor(createRefreshErrorHandler(apiClient, store))

  const uninstallGraphql = addGraphqlClientRawErrorInterceptor(createRefreshErrorHandler(graphqlApiClient, store))

  uninstallRefreshInterceptor = () => {
    uninstallApi()
    uninstallGraphql()
    uninstallRefreshInterceptor = null
  }

  return uninstallRefreshInterceptor
}
