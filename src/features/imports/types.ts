export type PageResult<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type ImportMappingEntry = {
  originalHeader: string
  systemField: string
}

export type ImportDataEntry = {
  key: string
  value: string | null
}

export type ImportRowError = {
  field: string | null
  message: string
}

export type ImportSessionSummary = {
  createdAt: string | null
  expiresAt: string | null
  fileName: string
  id: string
  importedRows: number
  invalidRows: number
  schoolId: string
  skippedRows: number
  status: string
  totalRows: number
  type: string
  updatedAt: string | null
  validRows: number
}

export type ImportSessionDetails = ImportSessionSummary & {
  confirmedMapping: ImportMappingEntry[]
  failureReason: string | null
  importedEntityId: string | null
  originalHeaders: string[]
  suggestedMapping: ImportMappingEntry[]
}

export type ImportRow = {
  errors: ImportRowError[]
  id: string
  mappedData: ImportDataEntry[]
  rawData: ImportDataEntry[]
  rowNumber: number
  sessionId: string
  status: string
}

export type ImportSessionFilters = {
  status: string
  type: string
}

export function formatImportDate(value?: string | null) {
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

export function getImportStatusDisplay(status?: string | null) {
  const normalized = status?.trim().toUpperCase()

  if (normalized === 'COMPLETED') {
    return {
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: 'Hoàn tất',
    }
  }

  if (normalized === 'PREVIEWED') {
    return {
      className: 'border-blue-200 bg-blue-50 text-blue-700',
      label: 'Đang preview',
    }
  }

  if (normalized === 'CANCELLED') {
    return {
      className: 'border-slate-200 bg-slate-100 text-slate-600',
      label: 'Đã hủy',
    }
  }

  if (normalized === 'EXPIRED') {
    return {
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      label: 'Hết hạn',
    }
  }

  if (normalized === 'FAILED') {
    return {
      className: 'border-red-200 bg-red-50 text-red-700',
      label: 'Thất bại',
    }
  }

  return {
    className: 'border-slate-200 bg-white text-slate-700',
    label: normalized || '-',
  }
}

export function getImportTypeDisplay(type?: string | null) {
  const normalized = type?.trim().toUpperCase()

  if (normalized === 'SCHOOL_CLASS') {
    return 'Lớp học'
  }

  if (normalized === 'SCHOOL_CLASS_USER') {
    return 'Học viên trong lớp'
  }

  if (normalized === 'USER') {
    return 'Người dùng'
  }

  return normalized || '-'
}

export function getImportUpdatedRows(session: {
  importedRows: number
  invalidRows: number
  totalRows: number
}) {
  return Math.max(
    0,
    session.totalRows - session.importedRows - session.invalidRows,
  )
}
