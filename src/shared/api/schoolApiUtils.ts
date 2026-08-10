import { getStoredAuthClaims } from '@/features/auth/session/authSession'

export type ApiResponse<T> = {
  data: T
  message: string
}

export type MutationResult<TData> = {
  data: TData
  message: string
}

export function requireSchoolId() {
  const schoolId = getStoredAuthClaims()?.schoolId?.trim()

  if (!schoolId) {
    throw {
      message: 'Missing schoolId in access token.',
    }
  }

  return schoolId
}
