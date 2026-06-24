import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosResponse } from 'axios'
import { Route, Routes } from 'react-router'
import { apiClient } from '@/shared/api'
import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { SchoolAdminClassUserImportPage } from './SchoolAdminClassUserImportPage'

const mockedRestPost = jest.spyOn(apiClient, 'post')
const mockedGraphqlPost = jest.spyOn(graphqlApiClient, 'post')

type ApiResponse<T> = {
  data: T
  message: string
}

const classId = '11111111-1111-4111-8111-111111111111'
const schoolId = '33333333-3333-4333-8333-333333333333'

function createJwt(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

function saveSession(nextSchoolId: string | null = schoolId) {
  localStorage.setItem(
    AUTH_TOKEN_STORAGE_KEYS.accessToken,
    createJwt({
      email: 'school-admin@vox.edu.vn',
      exp: Math.floor(Date.now() / 1000) + 3600,
      roles: ['SCHOOL_ADMIN'],
      ...(nextSchoolId ? { schoolId: nextSchoolId } : {}),
      userId: 'school-admin-1',
    }),
  )
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEYS.refreshToken, 'refresh-token')
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

function createPreviewResponse(overrides: Record<string, unknown> = {}) {
  return {
    expiresAt: '2026-06-12T00:00:00Z',
    fileName: 'class-users.csv',
    importSessionId: 'session-1',
    originalHeaders: ['Email', 'ClassCode'],
    sampleRows: [
      {
        ClassCode: 'ENG-6A',
        Email: 'student@vox.edu.vn',
      },
    ],
    suggestedMapping: {
      ClassCode: 'classCode',
      Email: 'email',
    },
    totalRows: 1,
    ...overrides,
  }
}

function mockClassDetail() {
  mockedGraphqlPost.mockResolvedValue({
    data: {
      data: {
        schoolClass: {
          code: 'ENG-6A',
          createdAt: '2026-06-01T00:00:00Z',
          description: null,
          id: classId,
          language: null,
          languageId: 'language-1',
          name: 'English 6A',
          school: null,
          schoolGrade: null,
          schoolGradeId: 'grade-1',
          schoolId,
          status: 'ACTIVE',
          updatedAt: '2026-06-02T00:00:00Z',
        },
      },
    },
  })
}

function mockImportSuccess() {
  mockedRestPost.mockImplementation((url) => {
    if (String(url).includes('/preview')) {
      return Promise.resolve({
        data: {
          data: createPreviewResponse(),
          message: 'Preview import người dùng vào lớp học thành công',
        },
      } as AxiosResponse<ApiResponse<unknown>>)
    }

    return Promise.resolve({
      data: {
        data: {
          importSessionId: 'session-1',
          importedRows: 1,
          invalidRows: 0,
          skippedRows: 0,
          status: 'COMPLETED',
          totalRows: 1,
        },
        message: 'Import người dùng vào lớp học thành công',
      },
    } as AxiosResponse<ApiResponse<unknown>>)
  })
}

function renderPage(queryClient = createQueryClient()) {
  return renderWithProviders(
    <Routes>
      <Route
        element={<SchoolAdminClassUserImportPage />}
        path="/school-admin/classes/:classId/users/import"
      />
    </Routes>,
    {
      queryClient,
      route: `/school-admin/classes/${classId}/users/import`,
    },
  )
}

function getFileInput() {
  return screen.getByLabelText(/chọn file csv hoặc excel/i)
}

describe('SchoolAdminClassUserImportPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockedRestPost.mockReset()
    mockedGraphqlPost.mockReset()
    saveSession()
    mockClassDetail()
  })

  it('renders the initial upload state', async () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: /import học viên vào lớp/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/csv hoặc excel/i).length).toBeGreaterThan(0)
    expect(
      screen.getByRole('link', { name: /quay lại/i }),
    ).toHaveAttribute('href', `/school-admin/classes/${classId}`)
    expect(await screen.findByText(/english 6a/i)).toBeInTheDocument()
  })

  it('previews an accepted import file', async () => {
    mockImportSuccess()
    const user = userEvent.setup()
    const file = new File(['content'], 'class-users.csv', { type: 'text/csv' })

    renderPage()

    await user.upload(getFileInput(), file)

    expect(
      await screen.findByText('Preview import người dùng vào lớp học thành công'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0)
    expect(screen.getByText('student@vox.edu.vn')).toBeInTheDocument()

    const formData = mockedRestPost.mock.calls[0]?.[1] as FormData
    expect(mockedRestPost).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/classes/users/import/preview`,
      expect.any(FormData),
    )
    expect(formData.get('file')).toBe(file)
  })

  it('requires all mandatory mappings before accepting import', async () => {
    mockedRestPost.mockResolvedValue({
      data: {
        data: createPreviewResponse({
          suggestedMapping: {
            Email: 'email',
          },
        }),
        message: 'Preview import người dùng vào lớp học thành công',
      },
    } as AxiosResponse<ApiResponse<unknown>>)
    const user = userEvent.setup()

    renderPage()

    await user.upload(
      getFileInput(),
      new File(['content'], 'class-users.csv', { type: 'text/csv' }),
    )

    expect(await screen.findByText(/cần ghép đủ trường bắt buộc/i)).toHaveTextContent(
      /Mã lớp/,
    )
    expect(
      screen.getByRole('button', { name: /xác nhận import/i }),
    ).toBeDisabled()
  })

  it('accepts the import and invalidates class queries', async () => {
    mockImportSuccess()
    const queryClient = createQueryClient()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')
    const user = userEvent.setup()

    renderPage(queryClient)

    await user.upload(
      getFileInput(),
      new File(['content'], 'class-users.csv', { type: 'text/csv' }),
    )
    await screen.findByText('Mapping đã đủ các trường bắt buộc.')
    await user.click(screen.getByRole('button', { name: /xác nhận import/i }))

    await waitFor(() => {
      expect(mockedRestPost).toHaveBeenCalledWith(
        `/v1/schools/${schoolId}/classes/users/import/session-1/accept`,
        {
          confirmedMapping: {
            ClassCode: 'classCode',
            Email: 'email',
          },
        },
      )
    })
    expect(await screen.findByText('Import học viên hoàn tất')).toBeInTheDocument()
    expect(screen.getByText('Đã import')).toBeInTheDocument()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['class-management'],
    })
  })
})
