import { QueryClient } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { renderWithProviders } from '@/test/renderWithProviders'
import { SchoolAdminClassImportPage } from './SchoolAdminClassImportPage'

const mockedRestPost = jest.spyOn(apiClient, 'post')

type ApiResponse<T> = {
  data: T
  message: string
}

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
    fileName: 'classes.csv',
    importSessionId: 'session-1',
    originalHeaders: ['ClassCode', 'ClassName', 'Language', 'Grade', 'Note'],
    sampleRows: [
      {
        ClassCode: 'ENG-6A',
        ClassName: 'Tiếng Anh 6A',
        Grade: 'G6',
        Language: 'EN',
        Note: 'Lớp buổi sáng',
      },
    ],
    suggestedMapping: {
      ClassCode: 'code',
      ClassName: 'name',
      Grade: 'schoolGradeCode',
      Language: 'languageCode',
      Note: 'description',
    },
    totalRows: 1,
    ...overrides,
  }
}

function mockImportSuccess() {
  mockedRestPost.mockImplementation((url) => {
    if (String(url).includes('/preview')) {
      return Promise.resolve({
        data: {
          data: createPreviewResponse(),
          message: 'Preview import lớp học thành công',
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
        message: 'Import lớp học thành công',
      },
    } as AxiosResponse<ApiResponse<unknown>>)
  })
}

function renderPage(queryClient = createQueryClient()) {
  return renderWithProviders(<SchoolAdminClassImportPage />, {
    queryClient,
    route: '/school-admin/classes/import',
  })
}

function getFileInput() {
  return screen.getByLabelText(/chọn file csv hoặc excel/i)
}

describe('SchoolAdminClassImportPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockedRestPost.mockReset()
    saveSession()
  })

  it('renders the initial upload state', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: /tạo lớp số lượng lớn/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/csv hoặc excel/i).length).toBeGreaterThan(0)
    expect(
      screen.getByRole('link', { name: /quay lại/i }),
    ).toHaveAttribute('href', '/school-admin/classes')
  })

  it.each([
    ['classes.csv', 'text/csv'],
    [
      'classes.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    ['classes.xls', 'application/vnd.ms-excel'],
  ])('previews an accepted import file %s', async (fileName, type) => {
    mockImportSuccess()
    const user = userEvent.setup()

    renderPage()

    const file = new File(['content'], fileName, { type })
    await user.upload(getFileInput(), file)

    expect(
      await screen.findByText('Preview import lớp học thành công'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('ClassCode').length).toBeGreaterThan(0)
    expect(screen.getByText('Tiếng Anh 6A')).toBeInTheDocument()

    const formData = mockedRestPost.mock.calls[0]?.[1] as FormData
    expect(mockedRestPost).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/classes/import/preview`,
      expect.any(FormData),
    )
    expect(formData.get('file')).toBe(file)
  })

  it('blocks unsupported file formats', async () => {
    renderPage()

    fireEvent.change(getFileInput(), {
      target: {
        files: [new File(['content'], 'classes.txt', { type: 'text/plain' })],
      },
    })

    expect(
      await screen.findByText(/file không hợp lệ.*csv hoặc excel/i),
    ).toBeInTheDocument()
    expect(mockedRestPost).not.toHaveBeenCalled()
  })

  it('requires all mandatory mappings before accepting import', async () => {
    mockedRestPost.mockResolvedValue({
      data: {
        data: createPreviewResponse({
          suggestedMapping: {
            ClassCode: 'code',
          },
        }),
        message: 'Preview import lớp học thành công',
      },
    } as AxiosResponse<ApiResponse<unknown>>)
    const user = userEvent.setup()

    renderPage()

    await user.upload(
      getFileInput(),
      new File(['content'], 'classes.csv', { type: 'text/csv' }),
    )

    expect(await screen.findByText(/cần ghép đủ trường bắt buộc/i)).toHaveTextContent(
      /Tên lớp.*Mã ngôn ngữ.*Mã khối lớp/,
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
      new File(['content'], 'classes.csv', { type: 'text/csv' }),
    )
    await screen.findByText('Mapping đã đủ các trường bắt buộc.')
    await user.click(screen.getByRole('button', { name: /xác nhận import/i }))

    await waitFor(() => {
      expect(mockedRestPost).toHaveBeenCalledWith(
        `/v1/schools/${schoolId}/classes/import/session-1/accept`,
        {
          confirmedMapping: {
            ClassCode: 'code',
            ClassName: 'name',
            Grade: 'schoolGradeCode',
            Language: 'languageCode',
            Note: 'description',
          },
        },
      )
    })
    expect(await screen.findByText('Import lớp học hoàn tất')).toBeInTheDocument()
    expect(screen.getByText('Đã import')).toBeInTheDocument()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['class-management'],
    })
  })

  it('shows preview and accept errors', async () => {
    mockedRestPost.mockRejectedValueOnce(new Error('Preview failed'))
    const user = userEvent.setup()

    renderPage()

    await user.upload(
      getFileInput(),
      new File(['content'], 'classes.csv', { type: 'text/csv' }),
    )

    expect(await screen.findByText('Preview failed')).toBeInTheDocument()

    mockImportSuccess()
    mockedRestPost.mockImplementation((url) => {
      if (String(url).includes('/preview')) {
        return Promise.resolve({
          data: {
            data: createPreviewResponse(),
            message: 'Preview import lớp học thành công',
          },
        } as AxiosResponse<ApiResponse<unknown>>)
      }

      return Promise.reject(new Error('Accept failed'))
    })

    await user.upload(
      getFileInput(),
      new File(['content'], 'classes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    )
    await screen.findByText('Mapping đã đủ các trường bắt buộc.')
    await user.click(screen.getByRole('button', { name: /xác nhận import/i }))

    expect(await screen.findByText('Accept failed')).toBeInTheDocument()
  })

  it('shows a user-facing error when school id is missing', async () => {
    saveSession(null)
    const user = userEvent.setup()

    renderPage()

    await user.upload(
      getFileInput(),
      new File(['content'], 'classes.csv', { type: 'text/csv' }),
    )

    expect(
      await screen.findByText(
        /chưa xác định được trường học hiện tại.*đăng nhập lại/i,
      ),
    ).toBeInTheDocument()
    expect(mockedRestPost).not.toHaveBeenCalled()
  })
})
