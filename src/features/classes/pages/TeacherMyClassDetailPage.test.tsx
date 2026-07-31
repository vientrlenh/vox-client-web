import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { MyClass, MyClassMember, PageResult } from '../types'
import { TeacherMyClassDetailPage } from './TeacherMyClassDetailPage'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const schoolId = '33333333-3333-4333-8333-333333333333'
const classId = 'class-1'

function createJwt(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

function saveSession() {
  localStorage.setItem(
    AUTH_TOKEN_STORAGE_KEYS.accessToken,
    createJwt({
      email: 'teacher@vox.edu.vn',
      exp: Math.floor(Date.now() / 1000) + 3600,
      roles: ['TEACHER'],
      schoolId,
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
    id: classId,
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

function createMember(overrides: Partial<MyClassMember> = {}): MyClassMember {
  return {
    id: 'member-1',
    isActive: true,
    joinedAt: '2026-06-01T00:00:00Z',
    leftAt: null,
    schoolClassId: classId,
    user: {
      email: 'hs1@vox.edu.vn',
      fullName: 'Nguyễn Văn A',
      id: 'user-1',
      phone: '0911000001',
      roleCodes: ['STUDENT'],
    },
    userId: 'user-1',
    ...overrides,
  }
}

function createMemberPage(content: MyClassMember[]): PageResult<MyClassMember> {
  return {
    content,
    page: 1,
    size: 20,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
  }
}

const memberVariables: Record<string, unknown>[] = []

function mockGraphQL({
  members = [createMember()],
  schoolClass = createClass(),
  classError,
}: {
  classError?: string
  members?: MyClassMember[]
  schoolClass?: MyClass
} = {}) {
  mockedPost.mockImplementation((_path, body) => {
    const request = body as {
      query: string
      variables?: Record<string, unknown>
    }

    if (request.query.includes('myClassMembers')) {
      memberVariables.push(request.variables ?? {})
      return Promise.resolve({
        data: { data: { myClassMembers: createMemberPage(members) } },
      })
    }

    if (classError) {
      return Promise.resolve({ data: { errors: [{ message: classError }] } })
    }

    return Promise.resolve({ data: { data: { myClass: schoolClass } } })
  })
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route element={<TeacherMyClassDetailPage />} path="/teacher/classes/:classId" />
    </Routes>,
    { queryClient: createQueryClient(), route: `/teacher/classes/${classId}` },
  )
}

describe('TeacherMyClassDetailPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockedPost.mockReset()
    memberVariables.length = 0
    saveSession()
  })

  it('renders the class information tab first', async () => {
    mockGraphQL()

    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Tiếng Anh 6A' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Lớp buổi sáng')).toBeInTheDocument()
    expect(screen.getByText('Niên học 2026')).toBeInTheDocument()
    expect(screen.getByText('Tiếng Anh')).toBeInTheDocument()
    expect(screen.getByText('32')).toBeInTheDocument()
  })

  it('loads members only after switching to the members tab', async () => {
    const user = userEvent.setup()
    mockGraphQL()

    renderPage()
    await screen.findByRole('heading', { name: 'Tiếng Anh 6A' })
    expect(memberVariables).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: /thành viên/i }))

    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument()
    expect(screen.getByText('hs1@vox.edu.vn')).toBeInTheDocument()
    expect(
      within(screen.getByRole('table')).getByText('Học sinh'),
    ).toBeInTheDocument()
  })

  it('sends the selected role filter to the backend', async () => {
    const user = userEvent.setup()
    mockGraphQL()

    renderPage()
    await screen.findByRole('heading', { name: 'Tiếng Anh 6A' })
    await user.click(screen.getByRole('button', { name: /thành viên/i }))
    await screen.findByText('Nguyễn Văn A')

    await user.selectOptions(
      screen.getByRole('combobox', { name: /vai trò/i }),
      'TEACHER',
    )

    await waitFor(() => {
      expect(memberVariables.at(-1)).toMatchObject({
        page: 1,
        roleCode: 'TEACHER',
        schoolClassId: classId,
      })
    })
  })

  it('shows one shared message for missing and forbidden classes', async () => {
    mockGraphQL({ classError: 'Không tìm thấy lớp học' })

    renderPage()

    expect(
      await screen.findByText(
        /không tìm thấy lớp học hoặc bạn không có quyền truy cập/i,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /quay lại danh sách/i }),
    ).toBeInTheDocument()
  })

  it('exposes no editing affordances', async () => {
    const user = userEvent.setup()
    mockGraphQL()

    renderPage()
    await screen.findByRole('heading', { name: 'Tiếng Anh 6A' })
    await user.click(screen.getByRole('button', { name: /thành viên/i }))
    await screen.findByText('Nguyễn Văn A')

    expect(screen.queryByRole('button', { name: /thêm thành viên/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /sửa/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /xóa/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /gỡ khỏi lớp/i })).toBeNull()
  })
})
