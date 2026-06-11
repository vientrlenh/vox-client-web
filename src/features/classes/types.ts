export type SchoolClassStatus = 'ACTIVE' | 'ARCHIVED' | 'INACTIVE'

export type PageResult<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type SchoolClass = {
  code: string
  createdAt: string | null
  description: string | null
  id: string
  language?: RelatedClassObject | null
  languageId: string
  name: string
  school?: RelatedClassObject | null
  schoolGrade?: RelatedClassObject | null
  schoolGradeId: string
  schoolId: string
  status: SchoolClassStatus | string
  updatedAt: string | null
}

export type RelatedClassObject = {
  code?: string | null
  id: string
  name?: string | null
}

export type ClassUser = {
  assignedBy: string | null
  id: string
  isActive: boolean
  joinedAt: string | null
  leftAt: string | null
  schoolClassId: string
  user: UserSummary | null
  userId: string
}

export type UserSummary = {
  email: string
  fullName: string | null
  id: string
  phone: string | null
}

export type CreateSchoolClassRequest = {
  code: string
  description: string | null
  languageId: string
  name: string
  schoolGradeId: string
}

export type UpdateSchoolClassRequest = {
  description?: string | null
  name?: string
  status?: SchoolClassStatus
}

export type CreateSchoolClassResponse = {
  schoolClassId: string
}

export type DeleteSchoolClassResponse = {
  deleteType: string
  id: string
  status: string
  updatedAt: string
}

export type CreateClassUserResponse = {
  schoolClassUserId: string
}

export type ClassUserMutationResponse = {
  schoolClassId: string
}

export type ClassFilters = {
  languageId: string
  schoolGradeId: string
  search: string
  status: '' | SchoolClassStatus
}

export type ClassStatusDisplay = {
  className: string
  label: string
}

export function getClassStatusDisplay(
  status?: string | null,
): ClassStatusDisplay {
  const normalized = status?.trim().toUpperCase()

  if (normalized === 'ACTIVE') {
    return {
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: 'Đang hoạt động',
    }
  }

  if (normalized === 'ARCHIVED') {
    return {
      className: 'border-slate-200 bg-slate-100 text-slate-600',
      label: 'Đã lưu trữ',
    }
  }

  return {
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    label: 'Tạm dừng',
  }
}

export function formatClassDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatNullableText(value?: string | null) {
  return value?.trim() ? value : '-'
}
