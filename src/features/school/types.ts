// src/features/school/types.ts

export interface School {
  id: string
  code: string
  name: string | null
  description: string | null
  contactPhone: string | null
  contactEmail: string | null
  domain: string | null
  address: string | null
  studentCount: number | null
  isActive: boolean | null
  createdAt: string | null
  updatedAt: string | null
}

export interface SchoolPage {
  content: School[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}



export interface User {
  id: string
  email: string
  phone: string
  fullName: string | null
  gender: string | null
  dateOfBirth: string | null
  address: string | null
  avatarUrl: string | null
  status: string | null
  createdAt: string | null
  updatedAt: string | null
  roles: Role[] | null
}

export interface Role {
  id: string
  code: string
  name: string
}

export interface SchoolUser {
  id: string
  schoolId: string
  userId: string
  startDate: string | null
  endDate: string | null
  user: User | null
}

export interface SchoolUserPage {
  content: SchoolUser[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}


// Interface phụ trợ bọc response chuẩn của GraphQL
export interface GraphQLResponse<T> {
  data: T
  errors?: Array<{ message: string }>
}