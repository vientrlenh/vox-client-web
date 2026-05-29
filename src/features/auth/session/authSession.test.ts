import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import {
  clearAuthTokens,
  decodeAccessToken,
  getAuthTokens,
  getStoredAuthUser,
  saveAuthTokens,
} from './authSession'

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
})
