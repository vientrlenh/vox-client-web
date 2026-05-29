import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import {
  CLIENT_DEVICE_STORAGE_KEY,
  clearAuthTokens,
  decodeAccessToken,
  getClientDevice,
  getAuthTokens,
  getStoredAuthUser,
  saveAuthTokens,
} from './authSession'

const originalUserAgent = globalThis.navigator.userAgent

function createJwt(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

describe('authSession', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    Object.defineProperty(globalThis.navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    })
  })

  it('saves, reads, and clears auth tokens from localStorage', () => {
    saveAuthTokens({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })

    expect(getAuthTokens()).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEYS.accessToken)).toBe(
      'access-token',
    )

    clearAuthTokens()

    expect(getAuthTokens()).toBeNull()
  })

  it('decodes the access token user payload', () => {
    const accessToken = createJwt({
      email: 'admin@vox.edu.vn',
      exp: Math.floor(Date.now() / 1000) + 3600,
      roles: ['SYSTEM_ADMIN'],
      userId: 'user-1',
    })

    expect(decodeAccessToken(accessToken)).toEqual({
      email: 'admin@vox.edu.vn',
      exp: expect.any(Number),
      roles: ['SYSTEM_ADMIN'],
      userId: 'user-1',
    })
  })

  it('clears stored tokens when the access token is expired', () => {
    jest.spyOn(Date, 'now').mockReturnValue(2_000_000)
    const accessToken = createJwt({
      email: 'admin@vox.edu.vn',
      exp: 1,
      roles: ['SYSTEM_ADMIN'],
      userId: 'user-1',
    })

    saveAuthTokens({
      accessToken,
      refreshToken: 'refresh-token',
    })

    expect(getStoredAuthUser()).toBeNull()
    expect(getAuthTokens()).toBeNull()
  })

  it('persists one client device id and returns the WEB platform', () => {
    const firstDevice = getClientDevice()
    const secondDevice = getClientDevice()

    expect(firstDevice.deviceId).toEqual(expect.any(String))
    expect(secondDevice.deviceId).toBe(firstDevice.deviceId)
    expect(firstDevice.platform).toBe('WEB')
    expect(localStorage.getItem(CLIENT_DEVICE_STORAGE_KEY)).toBe(
      firstDevice.deviceId,
    )
  })

  it('uses a bounded user agent device name with a fallback', () => {
    Object.defineProperty(globalThis.navigator, 'userAgent', {
      configurable: true,
      value: ' '.repeat(8),
    })

    expect(getClientDevice().deviceName).toBe('Web Browser')

    Object.defineProperty(globalThis.navigator, 'userAgent', {
      configurable: true,
      value: 'Chrome/'.padEnd(300, 'x'),
    })

    const device = getClientDevice()

    expect(device.deviceName).toHaveLength(255)
    expect(device.deviceName).toBe('Chrome/'.padEnd(255, 'x'))
  })
})
