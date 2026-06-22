export type PageResult<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type SchoolUserRole = 'STUDENT' | 'TEACHER'

export type SchoolUserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'DISABLED'

export type Role = {
  code: string
  id: string
  name: string | null
}

export type SchoolUserProfile = {
  address: string | null
  avatarUrl?: string | null
  dateOfBirth: string | null
  email: string
  fullName: string | null
  gender?: string | null
  id?: string
  phone: string | null
  schoolRoles: Role[] | null
}

export type SchoolUser = {
  endDate: string | null
  id: string
  schoolId: string | null
  startDate: string | null
  user: SchoolUserProfile | null
  userId: string | null
}

export type SchoolUserFilters = {
  role: '' | SchoolUserRole
  search: string
  status: '' | SchoolUserStatus
}

export type CreateSchoolUserRequest = {
  address: string
  dateOfBirth: string
  email: string
  endDate: string | null
  fullName: string
  phone: string
  roleCode: SchoolUserRole
  startDate: string | null
}

export type UpdateSchoolUserInput = {
  address?: string | null
  dateOfBirth?: string | null
  fullName?: string
  phone?: string
}

export type CreateSchoolUserResponse = {
  id: string
}

export type UpdateSchoolUserResponse = {
  schoolUserId: string
}

export type PreviewSchoolUserImportResponse = {
  expiresAt: string | null
  fileName: string
  importSessionId: string
  originalHeaders: string[]
  sampleRows: Record<string, string | null | undefined>[]
  suggestedMapping: Record<string, string | null | undefined>
  totalRows: number
}

export type AcceptSchoolUserImportRequest = {
  confirmedMapping: Record<string, string>
}

export type AcceptSchoolUserImportResponse = {
  importSessionId: string
  importedRows: number
  invalidRows: number
  skippedRows: number
  status: string
  totalRows: number
  updatedRows: number
}

export type RoleDisplay = {
  className: string
  label: string
}

export function getRoleDisplay(code?: string | null): RoleDisplay {
  const normalized = code?.trim().toUpperCase()

  if (normalized === 'STUDENT') {
    return {
      className: 'border-blue-200 bg-blue-50 text-blue-700',
      label: 'Học sinh',
    }
  }

  if (normalized === 'TEACHER') {
    return {
      className: 'border-violet-200 bg-violet-50 text-violet-700',
      label: 'Giáo viên',
    }
  }

  return {
    className: 'border-slate-200 bg-slate-100 text-slate-600',
    label: code?.trim() || 'Không xác định',
  }
}

export type StatusDisplay = {
  className: string
  label: string
}

export function getUserStatusDisplay(status?: string | null): StatusDisplay {
  const normalized = status?.trim().toUpperCase()

  if (normalized === 'ACTIVE') {
    return {
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: 'Đang hoạt động',
    }
  }

  if (normalized === 'INACTIVE') {
    return {
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      label: 'Tạm dừng',
    }
  }

  if (normalized === 'LOCKED') {
    return {
      className: 'border-orange-200 bg-orange-50 text-orange-700',
      label: 'Đã khóa',
    }
  }

  if (normalized === 'DISABLED') {
    return {
      className: 'border-slate-200 bg-slate-100 text-slate-500',
      label: 'Đã vô hiệu hóa',
    }
  }

  return {
    className: 'border-slate-200 bg-slate-100 text-slate-600',
    label: status?.trim() || 'Không xác định',
  }
}

export function formatUserDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatNullableText(value?: string | null) {
  return value?.trim() ? value : '-'
}

/** Normalizes an ISO/date string to `yyyy-MM-dd` for date inputs and the API. */
export function toDateInputValue(value?: string | null) {
  if (!value) {
    return ''
  }

  const trimmed = value.trim()

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10)
  }

  const date = new Date(trimmed)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}
