import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { ImportRowPage, ImportSessionDto } from '../types'

const IMPORT_SESSION_QUERY = `
  query ImportSession($id: ID!) {
    importSession(id: $id) {
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
      failureReason
      expiresAt
      createdAt
      updatedAt
    }
  }
`

const IMPORT_ROWS_QUERY = `
  query ImportRows($sessionId: ID!, $page: Int!, $size: Int!, $status: String) {
    importRows(sessionId: $sessionId, page: $page, size: $size, status: $status) {
      content {
        id
        sessionId
        rowNumber
        rawData {
          key
          value
        }
        errors {
          field
          message
        }
        status
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type ImportSessionQueryData = {
  importSession: ImportSessionDto | null
}

type ImportRowsQueryData = {
  importRows: ImportRowPage
}

const IN_PROGRESS_STATUSES = new Set(['QUEUED', 'VALIDATING', 'IMPORTING'])

export const importSessionQueryKeys = {
  all: ['import-sessions'] as const,
  rows: (sessionId: string | null, page: number, size: number, status?: string) =>
    [...importSessionQueryKeys.all, sessionId, 'rows', page, size, status] as const,
  session: (id: string | null) => [...importSessionQueryKeys.all, id] as const,
}

export function useImportSessionQuery(
  id: string | null,
  options?: { poll?: boolean },
) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: async () => {
      const data = await graphQLRequest<ImportSessionQueryData>(
        IMPORT_SESSION_QUERY,
        { id },
      )
      return data.importSession
    },
    queryKey: importSessionQueryKeys.session(id),
    refetchInterval: (query) => {
      if (!options?.poll) {
        return false
      }
      const status = query.state.data?.status
      return status && IN_PROGRESS_STATUSES.has(status) ? 2000 : false
    },
  })
}

export function useImportRowsQuery(
  sessionId: string | null,
  page: number,
  size: number,
  status?: string,
) {
  return useQuery({
    enabled: Boolean(sessionId),
    queryFn: async () => {
      const data = await graphQLRequest<ImportRowsQueryData>(IMPORT_ROWS_QUERY, {
        page: page - 1,
        sessionId,
        size,
        status,
      })
      return { ...data.importRows, page: data.importRows.page + 1 }
    },
    queryKey: importSessionQueryKeys.rows(sessionId, page, size, status),
  })
}
