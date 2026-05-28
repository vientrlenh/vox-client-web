export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export const AUTH_TOKEN_STORAGE_KEYS = {
  accessToken: 'vox.accessToken',
  refreshToken: 'vox.refreshToken',
} as const

function getStorage() {
  if (typeof globalThis.localStorage === 'undefined') {
    return null
  }

  return globalThis.localStorage
}

export function saveAuthTokens(tokens: AuthTokens) {
  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.setItem(AUTH_TOKEN_STORAGE_KEYS.accessToken, tokens.accessToken)
  storage.setItem(AUTH_TOKEN_STORAGE_KEYS.refreshToken, tokens.refreshToken)
}

export function getAuthTokens(): AuthTokens | null {
  const storage = getStorage()

  if (!storage) {
    return null
  }

  const accessToken = storage.getItem(AUTH_TOKEN_STORAGE_KEYS.accessToken)
  const refreshToken = storage.getItem(AUTH_TOKEN_STORAGE_KEYS.refreshToken)

  if (!accessToken || !refreshToken) {
    return null
  }

  return {
    accessToken,
    refreshToken,
  }
}

export function clearAuthTokens() {
  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.removeItem(AUTH_TOKEN_STORAGE_KEYS.accessToken)
  storage.removeItem(AUTH_TOKEN_STORAGE_KEYS.refreshToken)
}
