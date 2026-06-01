export type RoleCode = 'SCHOOL_ADMIN' | 'STUDENT' | 'SYSTEM_ADMIN' | 'TEACHER'

export type ClientDevice = {
  deviceId: string
  deviceName: string
  platform: 'WEB'
}

export type LoginCredentials = {
  login: string
  password: string
}

export type LoginRequest = LoginCredentials & {
  device: ClientDevice
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  roles: RoleCode[]
}

export type RefreshRequest = {
  deviceId: string
  token: string
}

export type RefreshResponse = {
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

export type SetUpPasswordRequest = {
  password: string
  token: string
  userId: string
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
