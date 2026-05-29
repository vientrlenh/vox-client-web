import {
  clearAuthTokens,
  getAuthTokens,
  saveAuthTokens,
} from '@/shared/api/authTokenStorage'
import type { AuthTokens } from '@/shared/api/authTokenStorage'
import type { AuthUser, RoleCode } from '../types'

type JwtPayload = {
  email?: unknown
  exp?: unknown
  roles?: unknown
  userId?: unknown
}

export { clearAuthTokens, getAuthTokens, saveAuthTokens }
export type { AuthTokens }

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)

  return globalThis.atob(`${base64}${padding}`)
}

function isRoleCode(value: unknown): value is RoleCode {
  return (
    value === 'SCHOOL_ADMIN' ||
    value === 'STUDENT' ||
    value === 'SYSTEM_ADMIN' ||
    value === 'TEACHER'
  )
}

export function decodeAccessToken(accessToken: string): AuthUser | null {
  const [, payload] = accessToken.split('.')

  if (!payload) {
    return null
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as JwtPayload
    const roles = Array.isArray(parsed.roles)
      ? parsed.roles.filter(isRoleCode)
      : []

    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null
    }

    return {
      email: parsed.email,
      exp: parsed.exp,
      roles,
      userId: parsed.userId,
    }
  } catch {
    return null
  }
}

export function isAccessTokenExpired(user: AuthUser) {
  return user.exp * 1000 <= Date.now()
}

export function getStoredAuthUser() {
  const tokens = getAuthTokens()

  if (!tokens) {
    return null
  }

  const user = decodeAccessToken(tokens.accessToken)

  if (!user || isAccessTokenExpired(user)) {
    clearAuthTokens()
    return null
  }

  return user
}
