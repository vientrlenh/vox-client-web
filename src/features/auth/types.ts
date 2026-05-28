export type RoleCode = 'SCHOOL_ADMIN' | 'STUDENT' | 'SYSTEM_ADMIN' | 'TEACHER'

export type LoginRequest = {
  login: string
  password: string
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
}

export type RegisterRequest = {
  contactAddress: string
  contactEmail: string
  contactFullName: string
  contactPhone: string
  dateOfBirth: string
  identityNumber: string
  position: string
  postalCode: string
  schoolAddress: string
  schoolDomain: string
  schoolName: string
  studentCount: number
}

export type ApiResponse<T> = {
  data: T
  message: string
}

export type AuthUser = {
  email: string
  exp: number
  roles: RoleCode[]
  userId: string
}
