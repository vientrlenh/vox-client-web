import {
  IMPORT_STATUS_DISPLAY,
  IMPORT_TYPE_LABELS,
  type ImportStatusValue,
  type ImportTypeValue,
  normalizeImportKey,
} from './importTypes'

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
  // Session do System Admin tạo (rubric/chính sách phạm vi hệ thống, danh mục
  // trường) không gắn schoolId. Giá trị này quyết định URL accept.
  schoolId: string | null
  skippedRows: number
  status: string
  totalRows: number
  type: string
  updatedAt: string | null
  validRows: number
}

export type ImportSessionStatus = {
  id: string
  importedRows: number
  status: string
  totalRows: number
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

// Phần lớn endpoint accept chỉ trả message (data = null); riêng nhóm rubric và
// chính sách đánh giá trả biên nhận hàng đợi. Nên mọi trường payload đều optional.
export type AcceptImportSessionResponse = {
  importSessionId?: string
  importedRows?: number
  invalidRows?: number
  sessionId?: string
  skippedRows?: number
  status?: string
  totalRows?: number
}

export function mappingEntriesToRecord(entries: ImportMappingEntry[]) {
  return entries.reduce<Record<string, string>>((result, entry) => {
    result[entry.originalHeader] = entry.systemField
    return result
  }, {})
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
  const normalized = normalizeImportKey(status)
  const display = IMPORT_STATUS_DISPLAY[normalized as ImportStatusValue]

  if (display) {
    return display
  }

  return {
    className: 'border-slate-200 bg-white text-slate-700',
    label: normalized || '-',
  }
}

export function getImportTypeDisplay(type?: string | null) {
  const normalized = normalizeImportKey(type)

  return (
    IMPORT_TYPE_LABELS[normalized as ImportTypeValue] ?? (normalized || '-')
  )
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

export function getImportResultCounts(session: {
  importedRows: number
  invalidRows: number
  skippedRows: number
  status?: string | null
  totalRows: number
}) {
  if (session.status?.trim().toUpperCase() !== 'COMPLETED') {
    return { added: 0, invalid: 0, skipped: 0, updated: 0 }
  }

  return {
    added: session.importedRows,
    invalid: session.invalidRows,
    skipped: session.skippedRows,
    updated: getImportUpdatedRows(session),
  }
}
