import { AxiosError } from 'axios'
import type {
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { configureAppStore } from '@/app/store/store'
import { apiClient, getAuthTokens, saveAuthTokens } from '@/shared/api'
import { refreshAuthTokens } from '../api/refreshAuthTokens'
import { installAuthRefreshInterceptor } from './authRefreshInterceptor'

jest.mock('../api/refreshAuthTokens', () => ({
  refreshAuthTokens: jest.fn(),
}))

function createJwt(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

function createAccessToken() {
  return createJwt({
    email: 'admin@vox.edu.vn',
    exp: Math.floor(Date.now() / 1000) + 3600,
    roles: ['SYSTEM_ADMIN'],
    userId: 'user-1',
  })
}

function createResponse<T>(
  config: InternalAxiosRequestConfig,
  data: T,
): AxiosResponse<T> {
  return {
    config,
    data,
    headers: {},
    status: 200,
    statusText: 'OK',
  }
}

function rejectUnauthorized(config: InternalAxiosRequestConfig) {
  return Promise.reject(
    new AxiosError(
      'Unauthorized',
      AxiosError.ERR_BAD_REQUEST,
      config,
      undefined,
      {
        config,
        data: { message: 'Unauthorized' },
        headers: {},
        status: 401,
        statusText: 'Unauthorized',
      },
    ),
  )
}

describe('authRefreshInterceptor', () => {
  let originalAdapter: typeof apiClient.defaults.adapter
  let uninstall: (() => void) | undefined

  beforeEach(() => {
    originalAdapter = apiClient.defaults.adapter
    localStorage.clear()
    jest.mocked(refreshAuthTokens).mockReset()
  })

  afterEach(() => {
    uninstall?.()
    uninstall = undefined
    apiClient.defaults.adapter = originalAdapter
    jest.restoreAllMocks()
  })

  it('refreshes tokens and retries an authenticated request once on 401', async () => {
    const store = configureAppStore()
    const newAccessToken = createAccessToken()
    const adapter = jest.fn((config: InternalAxiosRequestConfig) => {
      const retriedConfig = config as InternalAxiosRequestConfig & {
        _authRetry?: boolean
      }

      if (!retriedConfig._authRetry) {
        return rejectUnauthorized(config)
      }

      return Promise.resolve(createResponse(config, { ok: true }))
    })

    saveAuthTokens({
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
    })
    jest.mocked(refreshAuthTokens).mockResolvedValue({
      accessToken: newAccessToken,
      refreshToken: 'new-refresh-token',
    })
    apiClient.defaults.adapter = adapter
    uninstall = installAuthRefreshInterceptor(store)

    await expect(apiClient.get('/v1/protected')).resolves.toMatchObject({
      data: { ok: true },
    })

    expect(refreshAuthTokens).toHaveBeenCalledTimes(1)
    expect(refreshAuthTokens).toHaveBeenCalledWith('old-refresh-token')
    expect(adapter).toHaveBeenCalledTimes(2)
    expect(adapter.mock.calls[1][0].headers.Authorization).toBe(
      `Bearer ${newAccessToken}`,
    )
    expect(getAuthTokens()).toEqual({
      accessToken: newAccessToken,
      refreshToken: 'new-refresh-token',
    })
    expect(store.getState().auth.status).toBe('authenticated')
  })

  it('shares one refresh request across concurrent 401 responses', async () => {
    const store = configureAppStore()
    const newAccessToken = createAccessToken()
    const adapter = jest.fn((config: InternalAxiosRequestConfig) => {
      const retriedConfig = config as InternalAxiosRequestConfig & {
        _authRetry?: boolean
      }

      if (!retriedConfig._authRetry) {
        return rejectUnauthorized(config)
      }

      return Promise.resolve(createResponse(config, { url: config.url }))
    })

    saveAuthTokens({
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
    })
    jest.mocked(refreshAuthTokens).mockResolvedValue({
      accessToken: newAccessToken,
      refreshToken: 'new-refresh-token',
    })
    apiClient.defaults.adapter = adapter
    uninstall = installAuthRefreshInterceptor(store)

    await Promise.all([apiClient.get('/v1/one'), apiClient.get('/v1/two')])

    expect(refreshAuthTokens).toHaveBeenCalledTimes(1)
    expect(adapter).toHaveBeenCalledTimes(4)
  })

  it('does not refresh login or refresh endpoint failures', async () => {
    const store = configureAppStore()

    saveAuthTokens({
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
    })
    apiClient.defaults.adapter = (config: InternalAxiosRequestConfig) =>
      rejectUnauthorized(config)
    uninstall = installAuthRefreshInterceptor(store)

    await expect(apiClient.post('/v1/auth/login')).rejects.toMatchObject({
      status: 401,
    })
    await expect(apiClient.post('/v1/auth/refresh')).rejects.toMatchObject({
      status: 401,
    })

    expect(refreshAuthTokens).not.toHaveBeenCalled()
  })

  it('clears session when refresh fails', async () => {
    const store = configureAppStore()

    saveAuthTokens({
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
    })
    jest.mocked(refreshAuthTokens).mockRejectedValue(new Error('refresh failed'))
    apiClient.defaults.adapter = (config: InternalAxiosRequestConfig) =>
      rejectUnauthorized(config)
    uninstall = installAuthRefreshInterceptor(store)

    await expect(apiClient.get('/v1/protected')).rejects.toMatchObject({
      message: 'refresh failed',
    })

    expect(getAuthTokens()).toBeNull()
    expect(store.getState().auth.status).toBe('anonymous')
  })
})
