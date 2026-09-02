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

/**
 * Tạo trường trực tiếp, không qua đơn đăng ký (POST /v1/schools, chỉ SYSTEM_ADMIN).
 *
 * <p>Bốn trường `school*` và `schoolDirectoryId` loại trừ nhau: có `schoolDirectoryId` thì server
 * LẤY TRỌN mã / tên / địa chỉ / domain từ danh mục và bỏ qua phần tự khai — nên đừng gửi kèm cả
 * hai, người dùng sẽ tưởng giá trị mình gõ được lưu. Server yêu cầu có danh mục, HOẶC đủ cả mã +
 * tên + địa chỉ.
 */
export type CreateSchoolRequest = {
  adminAddress: string | null
  adminAvatarUrl: string | null
  /** Chuỗi ngày; server nhận yyyy-MM-dd nên giá trị thô của input[type=date] dùng thẳng được. */
  adminDateOfBirth: string
  adminEmail: string
  adminFullName: string
  adminPhone: string | null
  schoolAddress: string | null
  schoolCode: string | null
  schoolDirectoryId: string | null
  schoolDomain: string | null
  schoolName: string | null
  studentCount: number
}

/**
 * Đúng theo @Size của CreateSchoolRequest ở backend — dùng chung cho maxLength lẫn validate.
 *
 * CỐ Ý thiếu adminAvatarUrl dù backend vẫn có @Size(4096) cho nó: URL ảnh không còn do người dùng
 * gõ tay nữa mà do AvatarUploadField sinh ra sau khi tải ảnh lên Storage, nên không có ô input nào
 * cần maxLength. Thêm lại vào đây là thêm một hằng số không ai đọc.
 */
export const CREATE_SCHOOL_FIELD_LIMITS = {
  adminAddress: 255,
  adminEmail: 255,
  adminFullName: 255,
  adminPhone: 20,
  schoolAddress: 512,
  schoolCode: 100,
  schoolDomain: 100,
  schoolName: 255,
} as const



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