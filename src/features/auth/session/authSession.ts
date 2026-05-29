import {
  clearAuthTokens,
  getAuthTokens,
  saveAuthTokens,
} from '@/shared/api/authTokenStorage'
import type { AuthTokens } from '@/shared/api/authTokenStorage'
import type { AuthUser, ClientDevice, RoleCode } from '../types'

type JwtPayload = {
  email?: unknown
  exp?: unknown
  roles?: unknown
  userId?: unknown
}

export const CLIENT_DEVICE_STORAGE_KEY = 'vox.deviceId'

export { clearAuthTokens, getAuthTokens, saveAuthTokens }
export type { AuthTokens }

function getStorage() {
  if (typeof globalThis.localStorage === 'undefined') {
    return null
  }

  return globalThis.localStorage
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)

  return globalThis.atob(`${base64}${padding}`)
}

function createDeviceId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `web-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`
}

function getDeviceId() {
  const storage = getStorage()
  const storedDeviceId = storage?.getItem(CLIENT_DEVICE_STORAGE_KEY)

  if (storedDeviceId) {
    return storedDeviceId
  }

  const deviceId = createDeviceId()
  storage?.setItem(CLIENT_DEVICE_STORAGE_KEY, deviceId)

  return deviceId
}

function getDeviceName() {
  const userAgent =
    typeof globalThis.navigator === 'undefined'
      ? ''
      : globalThis.navigator.userAgent
  const normalized = userAgent.trim() || 'Web Browser'

  return normalized.slice(0, 255)
}

export function getClientDevice(): ClientDevice {
  return {
    deviceId: getDeviceId(),
    deviceName: getDeviceName(),
    platform: 'WEB',
  }
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
