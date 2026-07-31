import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { MyClass, PageResult } from '../types'
import { TeacherMyClassesPage } from './TeacherMyClassesPage'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

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
      email: 'teacher@vox.edu.vn',
      exp: Math.floor(Date.now() / 1000) + 3600,
      roles: ['TEACHER'],
      ...(nextSchoolId ? { schoolId: nextSchoolId } : {}),
      userId: 'teacher-1',
    }),
  )
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

function createClass(overrides: Partial<MyClass> = {}): MyClass {
  return {
    activeMemberCount: 32,
    code: 'ENG-6A',
    createdAt: '2026-06-01T00:00:00Z',
    description: 'Lớp buổi sáng',
    id: 'class-1',
    language: { code: 'EN', id: 'lang-1', name: 'Tiếng Anh' },
    languageId: 'lang-1',
    name: 'Tiếng Anh 6A',
    schoolGrade: { code: 'NH-2026', id: 'grade-1', name: 'Niên học 2026' },
    schoolGradeId: 'grade-1',
    schoolId,
    status: 'ACTIVE',
    updatedAt: '2026-06-02T00:00:00Z',
    ...overrides,
  }
}

function createClassPage(
  content: MyClass[],
  overrides: Partial<PageResult<MyClass>> = {},
): PageResult<MyClass> {
  return {
    content,
    page: 1,
    size: 10,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    ...overrides,
  }
}

const capturedVariables: Record<string, unknown>[] = []

function mockMyClasses(page: PageResult<MyClass>) {
  mockedPost.mockImplementation((_path, body) => {
    const request = body as {
      query: string
      variables?: Record<string, unknown>
    }
    capturedVariables.push(request.variables ?? {})

    return Promise.resolve({ data: { data: { myClasses: page } } })
  })
}

function LocationProbe() {
  const location = useLocation()

  return <span data-testid="current-path">{location.pathname}</span>
}

function renderPage() {
  return renderWithProviders(
    <>
      <TeacherMyClassesPage />
      <LocationProbe />
    </>,
    { queryClient: createQueryClient(), route: '/teacher/classes' },
  )
}

describe('TeacherMyClassesPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockedPost.mockReset()
    capturedVariables.length = 0
    saveSession()
  })

  it('renders the classes the teacher belongs to', async () => {
    mockMyClasses(createClassPage([createClass()]))

    renderPage()

    expect(await screen.findByText('Tiếng Anh 6A')).toBeInTheDocument()
    expect(screen.getByText('ENG-6A')).toBeInTheDocument()
    expect(screen.getByText('Niên học 2026')).toBeInTheDocument()
    expect(screen.getByText('Tiếng Anh')).toBeInTheDocument()
    expect(screen.getByText('32')).toBeInTheDocument()
    // "Đang hoạt động" cũng là một option của bộ lọc trạng thái nên phải khoanh
    // vùng trong bảng, không thì khớp hai chỗ.
    expect(
      within(screen.getByRole('table')).getByText(/đang hoạt động/i),
    ).toBeInTheDocument()
  })

  it('sends a 1-based page and null filters by default', async () => {
    mockMyClasses(createClassPage([createClass()]))

    renderPage()

    await screen.findByText('Tiếng Anh 6A')
    expect(capturedVariables[0]).toMatchObject({
      page: 1,
      schoolId,
      search: null,
      size: 10,
      status: null,
    })
  })

  it('renders an empty state when the teacher has no classes', async () => {
    mockMyClasses(createClassPage([]))

    renderPage()

    expect(await screen.findByText(/chưa có lớp học nào/i)).toBeInTheDocument()
  })

  it('renders an error state with a retry action', async () => {
    mockedPost.mockResolvedValue({
      data: { errors: [{ message: 'Quyền truy cập không hợp lệ' }] },
    })

    renderPage()

    expect(
      await screen.findByText(/quyền truy cập không hợp lệ/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument()
  })

  it('resets to the first page when a filter changes', async () => {
    const user = userEvent.setup()
    mockMyClasses(
      createClassPage([createClass()], { totalElements: 30, totalPages: 3 }),
    )

    renderPage()
    await screen.findByText('Tiếng Anh 6A')

    await user.click(screen.getByRole('button', { name: /^sau$/i }))
    await waitFor(() => {
      expect(capturedVariables.at(-1)).toMatchObject({ page: 2 })
    })

    await user.selectOptions(
      screen.getByRole('combobox', { name: /trạng thái/i }),
      'ARCHIVED',
    )

    await waitFor(() => {
      expect(capturedVariables.at(-1)).toMatchObject({
        page: 1,
        status: 'ARCHIVED',
      })
    })
  })

  it('navigates to the class detail page when a row is clicked', async () => {
    const user = userEvent.setup()
    mockMyClasses(createClassPage([createClass()]))

    renderPage()
    await user.click(await screen.findByText('Tiếng Anh 6A'))

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent(
        '/teacher/classes/class-1',
      )
    })
  })

  it('exposes no editing affordances', async () => {
    mockMyClasses(createClassPage([createClass()]))

    renderPage()
    await screen.findByText('Tiếng Anh 6A')

    expect(screen.queryByRole('button', { name: /tạo lớp/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /sửa/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /xóa/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /thao tác/i })).toBeNull()
  })

  it('asks the teacher to sign in again when the token has no school', async () => {
    saveSession(null)
    mockMyClasses(createClassPage([createClass()]))

    renderPage()

    expect(
      await screen.findByText(/chưa xác định được trường học hiện tại/i),
    ).toBeInTheDocument()
    expect(mockedPost).not.toHaveBeenCalled()
  })
})
