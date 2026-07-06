export type PageResult<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** Một trường trong danh mục hệ thống (catalog toàn hệ thống). */
export type SchoolDirectory = {
  address: string | null
  code: string | null
  createdAt: string | null
  districtName: string | null
  domain: string | null
  id: string
  name: string | null
  origin: string | null
  provinceCode: string | null
  provinceName: string | null
  updatedAt: string | null
  verified: boolean | null
}

export type SchoolDirectoryPage = PageResult<SchoolDirectory>

export type PreviewSchoolDirectoryImportResponse = {
  expiresAt: string | null
  fileName: string
  importSessionId: string
  originalHeaders: string[]
  sampleRows: Record<string, string | null | undefined>[]
  suggestedMapping: Record<string, string | null | undefined>
  totalRows: number
}

export type AcceptSchoolDirectoryImportRequest = {
  confirmedMapping: Record<string, string>
}

export type VerifiedDisplay = {
  className: string
  label: string
}

export function getVerifiedDisplay(verified?: boolean | null): VerifiedDisplay {
  if (verified) {
    return {
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: 'Đã xác minh',
    }
  }

  return {
    className: 'border-slate-200 bg-slate-100 text-slate-600',
    label: 'Chưa xác minh',
  }
}

export function formatSchoolDirectoryDate(value?: string | null) {
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
