import { QueryClient } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { createTestProviders } from '@/test/renderWithProviders'
import type {
  ImportRow,
  ImportSessionDetails,
  ImportSessionSummary,
  PageResult,
} from '../types'
import {
  fetchImportRows,
  fetchImportSession,
  fetchImportSessions,
  useImportRowsQuery,
  useImportSessionQuery,
} from './useImportSessionsQuery'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const mockSession: ImportSessionSummary = {
  createdAt: '2026-06-12T00:00:00Z',
  expiresAt: '2026-06-13T00:00:00Z',
  fileName: 'classes.csv',
  id: 'session-1',
  importedRows: 1,
  invalidRows: 0,
  schoolId: 'school-1',
  skippedRows: 0,
  status: 'COMPLETED',
  totalRows: 1,
  type: 'SCHOOL_CLASS',
  updatedAt: '2026-06-12T00:05:00Z',
  validRows: 1,
}

const mockSessionPage: PageResult<ImportSessionSummary> = {
  content: [mockSession],
  page: 1,
  size: 10,
  totalElements: 1,
  totalPages: 1,
}

const mockDetails: ImportSessionDetails = {
  ...mockSession,
  confirmedMapping: [{ originalHeader: 'ClassCode', systemField: 'code' }],
  failureReason: null,
  importedEntityId: null,
  originalHeaders: ['ClassCode'],
  suggestedMapping: [{ originalHeader: 'ClassCode', systemField: 'code' }],
}

const mockRow: ImportRow = {
  errors: [],
  id: 'row-1',
  mappedData: [{ key: 'code', value: 'ENG-6A' }],
  rawData: [{ key: 'ClassCode', value: 'ENG-6A' }],
  rowNumber: 1,
  sessionId: 'session-1',
  status: 'IMPORTED',
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

describe('import management GraphQL API', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('fetches import sessions with filters', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: {
          importSessions: mockSessionPage,
        },
      },
    })

    await expect(
      fetchImportSessions(1, 10, {
        status: 'COMPLETED',
        type: 'SCHOOL_CLASS',
      }),
    ).resolves.toEqual(mockSessionPage)

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('importSessions')
    expect(requestBody.variables).toEqual({
      page: 1,
      size: 10,
      status: 'COMPLETED',
      type: 'SCHOOL_CLASS',
    })
  })

  it('fetches import session detail', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: {
          importSession: mockDetails,
        },
      },
    })

    await expect(fetchImportSession('session-1')).resolves.toEqual(mockDetails)

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('importSession')
    expect(requestBody.variables).toEqual({ id: 'session-1' })
  })

  it('fetches import rows with status filter', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: {
          importRows: {
            content: [mockRow],
            page: 1,
            size: 10,
            totalElements: 1,
            totalPages: 1,
          },
        },
      },
    })

    await expect(fetchImportRows('session-1', 1, 10, 'IMPORTED')).resolves
      .toMatchObject({
        content: [mockRow],
      })

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('importRows')
    expect(requestBody.variables).toEqual({
      page: 1,
      sessionId: 'session-1',
      size: 10,
      status: 'IMPORTED',
    })
  })

  it('does not request detail or rows without a session id', () => {
    const providers = createTestProviders({
      queryClient: createQueryClient(),
    })

    renderHook(() => useImportSessionQuery(null), {
      wrapper: providers.Wrapper,
    })
    renderHook(() => useImportRowsQuery(null, 1, 10, ''), {
      wrapper: providers.Wrapper,
    })

    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('requests rows when a session id is provided', async () => {
    const providers = createTestProviders({
      queryClient: createQueryClient(),
    })

    mockedPost.mockResolvedValue({
      data: {
        data: {
          importRows: {
            content: [],
            page: 1,
            size: 10,
            totalElements: 0,
            totalPages: 0,
          },
        },
      },
    })

    const { result } = renderHook(
      () => useImportRowsQuery('session-1', 1, 10, ''),
      {
        wrapper: providers.Wrapper,
      },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('importRows')
    expect(requestBody.variables).toEqual({
      page: 1,
      sessionId: 'session-1',
      size: 10,
      status: null,
    })
  })
})
