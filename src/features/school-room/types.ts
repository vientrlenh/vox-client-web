export type SchoolRoom = {
  code: string
  createdAt: string | null
  createdBy: string | null
  description: string | null
  id: string
  isActive: boolean
  name: string
  schoolId: string
  updateBy: string | null
  updatedAt: string | null
}

export type SchoolRoomPage = {
  content: SchoolRoom[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type CreateSchoolRoomRequest = {
  code: string
  description?: string | null
  name: string
}

export type UpdateSchoolRoomRequest = {
  description?: string | null
  name?: string
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

export type SchoolRoomStatusDisplay = {
  className: string
  label: string
}

export function getSchoolRoomStatusDisplay(
  isActive?: boolean | null,
): SchoolRoomStatusDisplay {
  if (isActive) {
    return {
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: 'Đang hoạt động',
    }
  }

  return {
    className: 'border-slate-200 bg-slate-100 text-slate-600',
    label: 'Ngừng hoạt động',
  }
}

export function formatRoomDate(value?: string | null) {
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
