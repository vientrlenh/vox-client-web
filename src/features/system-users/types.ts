// src/features/system-users/types.ts

export interface Role {
  id: string
  code: string
  name: string | null
}

export interface SystemUser {
  id: string
  email: string
  phone: string
  fullName: string | null
  gender: string | null
  dateOfBirth: string | null
  address: string | null
  avatarUrl: string | null
  createdAt: string | null
  updatedAt: string | null
  roles: Role[] | null
}

export interface SystemUserPage {
  content: SystemUser[]
  page: number
  size: number
  totalElements: number
}
