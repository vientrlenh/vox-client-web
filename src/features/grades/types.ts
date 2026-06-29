export type SchoolGradeLevelStatus = 'ACTIVE' | 'INACTIVE'

export type SchoolGradeStatus = 'INACTIVE' | 'ACTIVE' | 'ARCHIVED'

export type SchoolGradeLevel = {
  code: string
  createdAt: string | null
  description: string | null
  id: string
  name: string
  order: number
  schoolId: string
  status: SchoolGradeLevelStatus | string
  updatedAt: string | null
}

export type SchoolGrade = {
  code: string
  createdAt: string | null
  description: string | null
  endDate: string
  id: string
  name: string
  schoolId?: string | null
  startDate: string
  status: SchoolGradeStatus | string
  updatedAt: string | null
}

export type SchoolGradeLevelPage = {
  content: SchoolGradeLevel[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type SchoolGradePage = {
  content: SchoolGrade[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type CreateSchoolGradeLevelRequest = {
  code: string
  description?: string | null
  name: string
  order: number
}

export type UpdateSchoolGradeLevelRequest = {
  description?: string | null
  name?: string
  order?: number
}

export type CreateSchoolGradeRequest = {
  code: string
  description?: string | null
  endDate: string
  name: string
  startDate: string
}

export type UpdateSchoolGradeRequest = {
  description?: string | null
  endDate?: string
  name?: string
  startDate?: string
}

export type PreviewImportResponse = {
  expiresAt: string | null
  fileName: string
  importSessionId: string
  originalHeaders: string[]
  sampleRows: Record<string, string | null | undefined>[]
  suggestedMapping: Record<string, string | null | undefined>
  totalRows: number
}

export type AcceptImportRequest = {
  confirmedMapping: Record<string, string>
}

export type AcceptImportResponse = {
  importSessionId: string
  importedRows: number
  invalidRows: number
  skippedRows: number
  status: string
  totalRows: number
}

export type GradeLevelStatusDisplay = {
  className: string
  label: string
}

export type GradeStatusDisplay = {
  className: string
  label: string
}

export function getGradeLevelStatusDisplay(
  status?: string | null,
): GradeLevelStatusDisplay {
  const normalized = status?.trim().toUpperCase()

  if (normalized === 'ACTIVE') {
    return {
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: 'Đang hoạt động',
    }
  }

  return {
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    label: 'Tạm dừng',
  }
}

export function getGradeStatusDisplay(status?: string | null): GradeStatusDisplay {
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

export function formatGradeDate(value?: string | null) {
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

export function formatGradeDateOnly(value?: string | null) {
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
