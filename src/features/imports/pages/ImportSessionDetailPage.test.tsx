import { useEffect } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import { Route, Routes, useNavigate } from 'react-router'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ImportSessionDetails, ImportSessionNavState, PageResult } from '../types'
import type { ImportRow } from '../types'
import { ImportSessionDetailPage } from './ImportSessionDetailPage'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const SESSION_ID = 'session-1'

function createSession(
  overrides: Partial<ImportSessionDetails> = {},
): ImportSessionDetails {
  return {
    confirmedMapping: [{ originalHeader: 'ClassCode', systemField: 'code' }],
    createdAt: '2026-06-12T00:00:00Z',
    expiresAt: '2026-06-13T00:00:00Z',
    failureReason: null,
    fileName: 'classes.csv',
    id: SESSION_ID,
    importedEntityId: null,
    importedRows: 0,
    invalidRows: 0,
    originalHeaders: ['ClassCode'],
    schoolId: 'school-1',
    skippedRows: 0,
    status: 'IMPORTING',
    suggestedMapping: [],
    totalRows: 2,
    type: 'SCHOOL_CLASS',
    updatedAt: '2026-06-12T00:00:00Z',
    validRows: 2,
    ...overrides,
  }
}

const emptyRows: PageResult<ImportRow> = {
  content: [],
  page: 1,
  size: 10,
  totalElements: 0,
  totalPages: 0,
}

// Trang chi tiết gọi song song importSession và importRows qua cùng một endpoint
// GraphQL, nên phải phân nhánh theo nội dung query.
function mockGraphQL(sessions: ImportSessionDetails[]) {
  const queue = [...sessions]

  mockedPost.mockImplementation((_url, body) => {
    const query = String((body as { query: string }).query)

    if (query.includes('importRows')) {
      return Promise.resolve({ data: { data: { importRows: emptyRows } } })
    }

    const session = queue.length > 1 ? queue.shift() : queue[0]

    return Promise.resolve({ data: { data: { importSession: session } } })
  })
}

function renderPage(
  basePath: string,
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
) {
  return renderWithProviders(
    <Routes>
      <Route
        element={<ImportSessionDetailPage basePath={basePath} />}
        path={`${basePath}/imports/:sessionId`}
      />
    </Routes>,
    {
      queryClient,
      route: `${basePath}/imports/${SESSION_ID}`,
    },
  )
}

// renderWithProviders chỉ truyền pathname vào MemoryRouter, nên để kiểm tra
// ImportSessionNavState phải điều hướng đúng như trang import thật vẫn làm.
function ImportPageStub({ state }: { state: ImportSessionNavState }) {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(`/teacher/imports/${SESSION_ID}`, { state })
  }, [navigate, state])

  return null
}

describe('ImportSessionDetailPage', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('shows the processing banner and keeps polling while the import is running', async () => {
    mockGraphQL([createSession({ status: 'IMPORTING' })])

    renderPage('/school-admin')

    expect(await screen.findByText(/Đang xử lý import/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Làm mới/ })).toBeDisabled()

    const callsAfterFirstLoad = mockedPost.mock.calls.length

    await waitFor(
      () => {
        expect(mockedPost.mock.calls.length).toBeGreaterThan(callsAfterFirstLoad)
      },
      { timeout: 5000 },
    )
  })

  it('stops the processing banner once the session reaches a terminal status', async () => {
    mockGraphQL([createSession({ status: 'COMPLETED', importedRows: 2 })])

    renderPage('/school-admin')

    expect(await screen.findByText('classes.csv')).toBeInTheDocument()
    expect(screen.queryByText(/Đang xử lý import/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Làm mới/ })).toBeEnabled()
  })

  it('invalidates the caller feature queries when the import finishes', async () => {
    // Lần đọc đầu còn IMPORTING, lần poll sau đã COMPLETED.
    mockGraphQL([
      createSession({ status: 'IMPORTING' }),
      createSession({ importedRows: 2, status: 'COMPLETED' }),
    ])
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    renderPage('/school-admin', queryClient)

    await waitFor(
      () => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['import-management'],
        })
      },
      { timeout: 5000 },
    )
  })

  it('does not link the breadcrumb to the session list outside school admin', async () => {
    mockGraphQL([createSession({ status: 'COMPLETED' })])

    renderPage('/teacher')

    expect(await screen.findByText('classes.csv')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Quản lý import' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Quản lý import')).toBeInTheDocument()
    // Không có state điều hướng thì lùi về dashboard của vai trò.
    expect(
      screen.getByRole('link', { name: /Quay lại danh sách import/ }),
    ).toHaveAttribute('href', '/teacher/dashboard')
  })

  it('uses the return target passed by the calling import page', async () => {
    mockGraphQL([createSession({ status: 'COMPLETED' })])

    renderWithProviders(
      <Routes>
        <Route
          element={
            <ImportPageStub
              state={{
                invalidateKeys: [['question-management']],
                returnLabel: 'Quay lại danh sách câu hỏi',
                returnTo: '/teacher/questions/all',
              }}
            />
          }
          path="/teacher/questions/import"
        />
        <Route
          element={<ImportSessionDetailPage basePath="/teacher" />}
          path="/teacher/imports/:sessionId"
        />
      </Routes>,
      {
        queryClient: new QueryClient({
          defaultOptions: { queries: { retry: false } },
        }),
        route: '/teacher/questions/import',
      },
    )

    expect(await screen.findByText('classes.csv')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Quay lại danh sách câu hỏi/ }),
    ).toHaveAttribute('href', '/teacher/questions/all')
  })

  it('links the breadcrumb to the session list for school admin', async () => {
    mockGraphQL([createSession({ status: 'COMPLETED' })])

    renderPage('/school-admin')

    expect(await screen.findByText('classes.csv')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Quản lý import' }),
    ).toHaveAttribute('href', '/school-admin/imports')
  })
})
