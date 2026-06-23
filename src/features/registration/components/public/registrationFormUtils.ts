import type { ApiError } from '@/shared/api'

export function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export function sanitizeUrls(urls: string[]) {
  return urls.map((url) => url.trim()).filter((url) => url !== '')
}

function getFirstValidationError(details: unknown) {
  if (!details || typeof details !== 'object') {
    return null
  }

  const maybeErrors = (details as { errors?: unknown }).errors

  if (!maybeErrors || typeof maybeErrors !== 'object') {
    return null
  }

  return (
    Object.values(maybeErrors as Record<string, unknown>).find(
      (value): value is string =>
        typeof value === 'string' && value.trim() !== '',
    ) ?? null
  )
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as Partial<ApiError>
  const validationError = getFirstValidationError(apiError.details)

  if (validationError) {
    return validationError
  }

  if (typeof apiError.message === 'string' && apiError.message.trim()) {
    return apiError.message
  }

  return fallback
}
