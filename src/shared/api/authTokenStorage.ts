export type AuthTokens = {
  accessToken: string
}

export const AUTH_TOKEN_STORAGE_KEYS = {
  accessToken: 'vox.accessToken'
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
}

export function getAuthTokens(): AuthTokens | null {
  const storage = getStorage()

  if (!storage) {
    return null
  }

  const accessToken = storage.getItem(AUTH_TOKEN_STORAGE_KEYS.accessToken)

  if (!accessToken) {
    return null
  }

  return {
    accessToken
  }
}

export function clearAuthTokens() {
  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.removeItem(AUTH_TOKEN_STORAGE_KEYS.accessToken)
}
