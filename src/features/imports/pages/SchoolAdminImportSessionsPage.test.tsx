import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { IMPORT_STATUS_VALUES, IMPORT_TYPE_VALUES } from '../importTypes'
import type { ImportSessionSummary, PageResult } from '../types'
import { SchoolAdminImportSessionsPage } from './SchoolAdminImportSessionsPage'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const mockSession: ImportSessionSummary = {
  createdAt: '2026-06-12T00:00:00Z',
  expiresAt: '2026-06-13T00:00:00Z',
  fileName: 'rooms.csv',
  id: 'session-1',
  importedRows: 1,
  invalidRows: 0,
  schoolId: 'school-1',
  skippedRows: 0,
  status: 'COMPLETED',
  totalRows: 1,
  type: 'SCHOOL_ROOM',
  updatedAt: '2026-06-12T00:05:00Z',
  validRows: 1,
}

const mockPage: PageResult<ImportSessionSummary> = {
  content: [mockSession],
  page: 1,
  size: 10,
  totalElements: 1,
  totalPages: 1,
}

function lastVariables() {
  const calls = mockedPost.mock.calls
  const body = calls[calls.length - 1]?.[1] as {
    variables: Record<string, unknown>
  }

  return body?.variables
}

function renderPage() {
  return renderWithProviders(<SchoolAdminImportSessionsPage />, {
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
    route: '/school-admin/imports',
  })
}

describe('SchoolAdminImportSessionsPage', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockedPost.mockResolvedValue({
      data: { data: { importSessions: mockPage } },
    })
  })

  it('offers every backend import type and session status as a filter option', async () => {
    renderPage()

    const typeSelect = await screen.findByLabelText(/Loại import/)
    const statusSelect = screen.getByLabelText(/Trạng thái/)

    // "Tất cả" + đủ enum của backend.
    expect(within(typeSelect).getAllByRole('option')).toHaveLength(
      IMPORT_TYPE_VALUES.length + 1,
    )
    expect(within(statusSelect).getAllByRole('option')).toHaveLength(
      IMPORT_STATUS_VALUES.length + 1,
    )

    IMPORT_TYPE_VALUES.forEach((type) => {
      expect(typeSelect.querySelector(`option[value="${type}"]`)).not.toBeNull()
    })
    IMPORT_STATUS_VALUES.forEach((status) => {
      expect(
        statusSelect.querySelector(`option[value="${status}"]`),
      ).not.toBeNull()
    })
  })

  it('sends the selected enum names to the query', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(mockedPost).toHaveBeenCalled())

    await user.selectOptions(
      await screen.findByLabelText(/Loại import/),
      'QUESTION',
    )
    await user.selectOptions(screen.getByLabelText(/Trạng thái/), 'IMPORTING')

    await waitFor(() =>
      expect(lastVariables()).toEqual({
        page: 1,
        size: 10,
        status: 'IMPORTING',
        type: 'QUESTION',
      }),
    )
  })

  it('clears both filters from the reset button', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.queryByRole('button', { name: 'Xóa lọc' })).toBeNull()

    await user.selectOptions(
      await screen.findByLabelText(/Loại import/),
      'RUBRIC_VERSION',
    )
    await user.click(await screen.findByRole('button', { name: 'Xóa lọc' }))

    await waitFor(() =>
      expect(lastVariables()).toEqual({
        page: 1,
        size: 10,
        status: null,
        type: null,
      }),
    )
    expect(screen.queryByRole('button', { name: 'Xóa lọc' })).toBeNull()
  })

  it('shows a Vietnamese label for types the page could not label before', async () => {
    renderPage()

    expect(await screen.findByText('Phòng học')).toBeTruthy()
  })
})
