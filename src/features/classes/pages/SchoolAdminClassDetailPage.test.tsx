import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosResponse } from 'axios'
import { Route, Routes } from 'react-router'
import { apiClient } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { appConfig } from '@/shared/config/env'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ClassUser, PageResult, SchoolClass } from '../types'
import { formatClassDate } from '../types'
import { SchoolAdminClassDetailPage } from './SchoolAdminClassDetailPage'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')
const mockedRestPost = jest.spyOn(apiClient, 'post')
const mockedRestDelete = jest.spyOn(apiClient, 'delete')
const mockedRestPatch = jest.spyOn(apiClient, 'patch')

type MutableConfig = {
  schoolId: string
}

type ApiResponse<T> = {
  data: T
  message: string
}

const classId = 'class-1'
const schoolId = '33333333-3333-4333-8333-333333333333'

function setSchoolId(value: string) {
  ;(appConfig as unknown as MutableConfig).schoolId = value
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

function createClass(overrides: Partial<SchoolClass> = {}): SchoolClass {
  return {
    code: 'ENG-6A',
    createdAt: '2026-06-01T00:00:00Z',
    description: 'Lớp buổi sáng',
    id: classId,
    languageId: '01890f44-0c7a-7cc1-bc3b-2e7f4f001234',
    name: 'Tiếng Anh 6A',
    schoolGradeId: '11111111-1111-0111-0111-111111111111',
    schoolId,
    status: 'ACTIVE',
    updatedAt: '2026-06-02T00:00:00Z',
    ...overrides,
  }
}

function createClassUser(overrides: Partial<ClassUser> = {}): ClassUser {
  return {
    assignedBy: 'admin-user',
    id: 'class-user-1',
    isActive: true,
    joinedAt: '2026-06-03T00:00:00Z',
    leftAt: null,
    schoolClassId: classId,
    user: {
      email: 'student@vox.edu.vn',
      fullName: 'Nguyễn Văn A',
      id: 'user-1',
      phone: '0909000000',
    },
    userId: 'user-1',
    ...overrides,
  }
}

function createUserPage(
  content: ClassUser[],
  overrides: Partial<PageResult<ClassUser>> = {},
): PageResult<ClassUser> {
  return {
    content,
    page: 1,
    size: 10,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    ...overrides,
  }
}

function renderPage(route = `/school-admin/classes/${classId}`) {
  return renderWithProviders(
    <Routes>
      <Route
        element={<SchoolAdminClassDetailPage />}
        path="/school-admin/classes/:classId"
      />
    </Routes>,
    {
      queryClient: createQueryClient(),
      route,
    },
  )
}

function mockGraphQLSuccess({
  schoolClass = createClass(),
  usersPage = createUserPage([]),
}: {
  schoolClass?: SchoolClass | null
  usersPage?: PageResult<ClassUser>
} = {}) {
  mockedPost.mockImplementation((_path, body) => {
    const request = body as { query: string; variables?: Record<string, unknown> }

    if (request.query.includes('schoolClassUsers')) {
      return Promise.resolve({
        data: {
          data: {
            schoolClassUsers: usersPage,
          },
        },
      })
    }

    if (request.query.includes('updateSchoolClass')) {
      return Promise.resolve({
        data: {
          data: {
            updateSchoolClass: {
              schoolClassId: request.variables?.id,
            },
          },
        },
      })
    }

    return Promise.resolve({
      data: {
        data: {
          schoolClass,
        },
      },
    })
  })
}

async function openUsersTab(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: /tiếng anh 6a/i })
  await user.click(screen.getByRole('tab', { name: /học viên trong lớp/i }))
}

async function openUserActionMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', {
      name: /mở thao tác học viên nguyễn văn a/i,
    }),
  )

  return screen.findByRole('menu')
}

describe('SchoolAdminClassDetailPage', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockedRestPost.mockReset()
    mockedRestDelete.mockReset()
    mockedRestPatch.mockReset()
    setSchoolId(schoolId)
  })

  it('renders the loading state', () => {
    mockedPost.mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(
      screen.getByText(/đang tải thông tin lớp học/i),
    ).toBeInTheDocument()
  })

  it('renders the error state', async () => {
    mockedPost.mockRejectedValue(new Error('Detail failed'))

    renderPage()

    expect(await screen.findByText('Detail failed')).toBeInTheDocument()
  })

  it('renders the not found state', async () => {
    mockGraphQLSuccess({ schoolClass: null })

    renderPage()

    expect(await screen.findByText(/không tìm thấy lớp học/i)).toBeInTheDocument()
  })

  it('renders the class information tab with metadata', async () => {
    const schoolClass = createClass()

    mockGraphQLSuccess({ schoolClass })

    renderPage()

    expect(
      await screen.findByRole('heading', { name: /tiếng anh 6a/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /thông tin lớp/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getAllByText(classId).length).toBeGreaterThan(0)
    expect(screen.getAllByText('ENG-6A').length).toBeGreaterThan(0)
    expect(screen.getByText('Lớp buổi sáng')).toBeInTheDocument()
    expect(screen.getAllByText(formatClassDate(schoolClass.createdAt)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(formatClassDate(schoolClass.updatedAt)).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Đang hoạt động').length).toBeGreaterThan(0)
  })

  it('updates the class from the edit dialog', async () => {
    mockGraphQLSuccess()
    const user = userEvent.setup()

    renderPage()

    await screen.findByRole('heading', { name: /tiếng anh 6a/i })
    await user.click(screen.getByRole('button', { name: /chỉnh sửa/i }))

    const dialog = screen.getByRole('dialog', {
      name: /cập nhật lớp học/i,
    })

    expect(within(dialog).getByDisplayValue('Tiếng Anh 6A')).toBeInTheDocument()
    expect(within(dialog).getByDisplayValue('Lớp buổi sáng')).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/trạng thái/i)).toHaveValue('ACTIVE')

    await user.clear(within(dialog).getByLabelText(/tên lớp/i))
    await user.type(
      within(dialog).getByLabelText(/tên lớp/i),
      'Tiếng Anh 6A mới',
    )
    await user.click(
      within(dialog).getByRole('button', { name: /lưu lớp học/i }),
    )

    await waitFor(() => {
      const mutationRequest = mockedPost.mock.calls
        .map(
          (call) =>
            call[1] as { query: string; variables: Record<string, unknown> },
        )
        .find((request) => request.query.includes('updateSchoolClass'))

      expect(mutationRequest?.variables).toMatchObject({
        id: classId,
        input: {
          description: 'Lớp buổi sáng',
          name: 'Tiếng Anh 6A mới',
          status: 'ACTIVE',
        },
      })
    })
    expect(
      screen.queryByRole('dialog', { name: /cập nhật lớp học/i }),
    ).not.toBeInTheDocument()
    expect(await screen.findByText('Class updated successfully.')).toBeInTheDocument()
  })

  it('shows update errors inside the edit dialog', async () => {
    mockedPost.mockImplementation((_path, body) => {
      const request = body as { query: string }

      if (request.query.includes('updateSchoolClass')) {
        return Promise.reject(new Error('Update failed'))
      }

      return Promise.resolve({
        data: {
          data: {
            schoolClass: createClass(),
          },
        },
      })
    })
    const user = userEvent.setup()

    renderPage()

    await screen.findByRole('heading', { name: /tiếng anh 6a/i })
    await user.click(screen.getByRole('button', { name: /chỉnh sửa/i }))

    const dialog = screen.getByRole('dialog', {
      name: /cập nhật lớp học/i,
    })

    await user.click(
      within(dialog).getByRole('button', { name: /lưu lớp học/i }),
    )

    expect(await within(dialog).findByText('Update failed')).toBeInTheDocument()
  })

  it('renders the empty class users tab', async () => {
    mockGraphQLSuccess({ usersPage: createUserPage([]) })
    const user = userEvent.setup()

    renderPage()
    await openUsersTab(user)

    expect(
      await screen.findByText(/chưa có học viên trong lớp/i),
    ).toBeInTheDocument()
    await waitFor(() => {
      const userRequests = mockedPost.mock.calls.filter((call) => {
        const request = call[1] as { query: string }

        return request.query.includes('schoolClassUsers')
      })

      expect(userRequests.length).toBeGreaterThan(0)
    })
  })

  it('renders populated class users', async () => {
    const classUser = createClassUser()

    mockGraphQLSuccess({ usersPage: createUserPage([classUser]) })
    const user = userEvent.setup()

    renderPage()
    await openUsersTab(user)

    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument()
    expect(screen.getAllByText('student@vox.edu.vn').length).toBeGreaterThan(0)
    expect(screen.getByText('0909000000')).toBeInTheDocument()
    expect(screen.getByText(formatClassDate(classUser.joinedAt))).toBeInTheDocument()
    expect(screen.getByText('admin-user')).toBeInTheDocument()
  })

  it('adds a user to the class', async () => {
    mockGraphQLSuccess({ usersPage: createUserPage([]) })
    mockedRestPost.mockResolvedValue({
      data: {
        data: { schoolClassUserId: 'class-user-1' },
        message: 'Đã thêm học viên',
      },
    } as AxiosResponse<ApiResponse<unknown>>)
    const user = userEvent.setup()

    renderPage()
    await openUsersTab(user)

    await user.type(screen.getByLabelText(/id học viên/i), 'user-1')
    await user.click(screen.getByRole('button', { name: /thêm học viên/i }))

    await waitFor(() => {
      expect(mockedRestPost).toHaveBeenCalledWith(
        `/v1/schools/${schoolId}/classes/${classId}/users`,
        { userId: 'user-1' },
      )
    })
    expect(await screen.findByText('Đã thêm học viên')).toBeInTheDocument()
  })

  it('toggles and removes a class user', async () => {
    mockGraphQLSuccess({ usersPage: createUserPage([createClassUser()]) })
    mockedRestPatch.mockResolvedValue({
      data: {
        data: { schoolClassId: classId },
        message: 'Đã cập nhật học viên',
      },
    } as AxiosResponse<ApiResponse<unknown>>)
    mockedRestDelete.mockResolvedValue({
      data: {
        data: { schoolClassId: classId },
        message: 'Đã xóa học viên',
      },
    } as AxiosResponse<ApiResponse<unknown>>)
    const user = userEvent.setup()

    renderPage()
    await openUsersTab(user)
    await screen.findByText('Nguyễn Văn A')

    let menu = await openUserActionMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: /tạm dừng/i }))

    await waitFor(() => {
      expect(mockedRestPatch).toHaveBeenCalledWith(
        `/v1/schools/${schoolId}/classes/${classId}/users/user-1/status`,
        { isActive: false },
      )
    })

    menu = await openUserActionMenu(user)
    await user.click(
      within(menu).getByRole('menuitem', { name: /xóa khỏi lớp/i }),
    )

    const dialog = screen.getByRole('dialog', {
      name: /xóa học viên khỏi lớp/i,
    })

    await user.click(
      within(dialog).getByRole('button', { name: /xóa khỏi lớp/i }),
    )

    await waitFor(() => {
      expect(mockedRestDelete).toHaveBeenCalledWith(
        `/v1/schools/${schoolId}/classes/${classId}/users/user-1`,
      )
    })
  })

  it('shows a user-facing error when school id is missing', async () => {
    setSchoolId('')
    mockGraphQLSuccess({ usersPage: createUserPage([]) })
    const user = userEvent.setup()

    renderPage()
    await openUsersTab(user)

    await user.type(screen.getByLabelText(/id học viên/i), 'user-1')
    await user.click(screen.getByRole('button', { name: /thêm học viên/i }))

    expect(
      await screen.findByText(/chưa xác định được trường học hiện tại/i),
    ).toBeInTheDocument()
    expect(mockedRestPost).not.toHaveBeenCalled()
  })
})
