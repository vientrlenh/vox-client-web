import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type {
  ImportRow,
  ImportSessionDetails,
  ImportSessionFilters,
  ImportSessionSummary,
  PageResult,
} from '../types'

const IMPORT_SESSION_SUMMARY_FIELDS = `
  id
  schoolId
  type
  fileName
  totalRows
  validRows
  invalidRows
  importedRows
  skippedRows
  status
  expiresAt
  createdAt
  updatedAt
`

const IMPORT_SESSION_DETAIL_FIELDS = `
  ${IMPORT_SESSION_SUMMARY_FIELDS}
  originalHeaders
  suggestedMapping {
    originalHeader
    systemField
  }
  confirmedMapping {
    originalHeader
    systemField
  }
  failureReason
  importedEntityId
`

const IMPORT_ROW_FIELDS = `
  id
  sessionId
  rowNumber
  rawData {
    key
    value
  }
  mappedData {
    key
    value
  }
  errors {
    field
    message
  }
  status
`

const IMPORT_SESSIONS_QUERY = `
  query ImportSessions($page: Int!, $size: Int!, $type: String, $status: String) {
    importSessions(page: $page, size: $size, type: $type, status: $status) {
      content {
        ${IMPORT_SESSION_SUMMARY_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

const IMPORT_SESSION_QUERY = `
  query ImportSession($id: ID!) {
    importSession(id: $id) {
      ${IMPORT_SESSION_DETAIL_FIELDS}
    }
  }
`

const IMPORT_ROWS_QUERY = `
  query ImportRows($sessionId: ID!, $page: Int!, $size: Int!, $status: String) {
    importRows(sessionId: $sessionId, page: $page, size: $size, status: $status) {
      content {
        ${IMPORT_ROW_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type ImportSessionsQueryData = {
  importSessions: PageResult<ImportSessionSummary>
}

type ImportSessionQueryData = {
  importSession: ImportSessionDetails | null
}

type ImportRowsQueryData = {
  importRows: PageResult<ImportRow>
}

export const importManagementQueryKeys = {
  all: ['import-management'] as const,
  detail: (id: string | null) =>
    [...importManagementQueryKeys.all, 'detail', id] as const,
  list: (page: number, size: number, filters: ImportSessionFilters) =>
    [
      ...importManagementQueryKeys.all,
      'list',
      page,
      size,
      filters.type,
      filters.status,
    ] as const,
  rows: (sessionId: string | null, page: number, size: number, status: string) =>
    [
      ...importManagementQueryKeys.all,
      'rows',
      sessionId,
      page,
      size,
      status,
    ] as const,
}

export async function fetchImportSessions(
  page: number,
  size: number,
  filters: ImportSessionFilters,
) {
  const data = await graphQLRequest<ImportSessionsQueryData>(
    IMPORT_SESSIONS_QUERY,
    {
      page,
      size,
      status: filters.status || null,
      type: filters.type || null,
    },
  )

  return data.importSessions
}

export async function fetchImportSession(id: string) {
  const data = await graphQLRequest<ImportSessionQueryData>(
    IMPORT_SESSION_QUERY,
    { id },
  )

  return data.importSession
}

export async function fetchImportRows(
  sessionId: string,
  page: number,
  size: number,
  status: string,
) {
  const data = await graphQLRequest<ImportRowsQueryData>(IMPORT_ROWS_QUERY, {
    page,
    sessionId,
    size,
    status: status || null,
  })

  return data.importRows
}

export function useImportSessionsQuery(
  page: number,
  size: number,
  filters: ImportSessionFilters,
) {
  return useQuery({
    queryFn: () => fetchImportSessions(page, size, filters),
    queryKey: importManagementQueryKeys.list(page, size, filters),
  })
}

export function useImportSessionQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchImportSession(id ?? ''),
    queryKey: importManagementQueryKeys.detail(id),
  })
}

export function useImportRowsQuery(
  sessionId: string | null,
  page: number,
  size: number,
  status: string,
) {
  return useQuery({
    enabled: Boolean(sessionId),
    queryFn: () => fetchImportRows(sessionId ?? '', page, size, status),
    queryKey: importManagementQueryKeys.rows(sessionId, page, size, status),
  })
}
