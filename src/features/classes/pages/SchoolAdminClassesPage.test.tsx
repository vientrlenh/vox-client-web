import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { appConfig } from '@/shared/config/env'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { PageResult, SchoolClass } from '../types'
import { formatClassDate } from '../types'
import { SchoolAdminClassesPage } from './SchoolAdminClassesPage'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')
const mockedRestPost = jest.spyOn(apiClient, 'post')
const mockedRestDelete = jest.spyOn(apiClient, 'delete')

type MutableConfig = {
  schoolId: string
}

type ApiResponse<T> = {
  data: T
  message: string
}

const languageId = '01890f44-0c7a-7cc1-bc3b-2e7f4f001234'
const gradeId = '11111111-1111-0111-0111-111111111111'
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
    id: 'class-1',
    languageId,
    name: 'Tiếng Anh 6A',
    schoolGradeId: gradeId,
    schoolId,
    status: 'ACTIVE',
    updatedAt: '2026-06-02T00:00:00Z',
    ...overrides,
  }
}

function createClassPage(
  content: SchoolClass[],
  overrides: Partial<PageResult<SchoolClass>> = {},
): PageResult<SchoolClass> {
  return {
    content,
    page: 1,
    size: 10,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    ...overrides,
  }
}

function renderPage() {
  return renderWithProviders(<SchoolAdminClassesPage />, {
    queryClient: createQueryClient(),
  })
}

function mockGraphQLSuccess(pages: Record<number, PageResult<SchoolClass>>) {
  mockedPost.mockImplementation((_path, body) => {
    const request = body as {
      query: string
      variables?: Record<string, unknown>
    }
    const page = Number(request.variables?.page ?? 1)

    if (request.query.includes('schoolClassUsers')) {
      throw new Error('SchoolAdminClassesPage must not request class users')
    }

    if (
      request.query.includes('schoolClass(') &&
      !request.query.includes('schoolClasses')
    ) {
      throw new Error('SchoolAdminClassesPage must not request class detail')
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
          schoolClasses: pages[page] ?? createClassPage([]),
        },
      },
    })
  })
}

async function openClassActionMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: /mở thao tác lớp eng-6a/i }),
  )

  return screen.findByRole('menu')
}

describe('SchoolAdminClassesPage', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockedRestPost.mockReset()
    mockedRestDelete.mockReset()
    setSchoolId(schoolId)
  })

  it('renders the loading state in Vietnamese', () => {
    mockedPost.mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(
      screen.getByText(/đang tải danh sách lớp học/i),
    ).toBeInTheDocument()
  })

  it('renders the empty state without a detail panel', async () => {
    mockGraphQLSuccess({
      1: createClassPage([]),
    })

    renderPage()

    expect(await screen.findByText(/chưa có lớp học/i)).toBeInTheDocument()
    expect(screen.queryByText(/class detail/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/class users/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/select a class to view details/i),
    ).not.toBeInTheDocument()
  })

  it('renders the class list with id and created date columns only', async () => {
    const schoolClass = createClass()

    mockGraphQLSuccess({
      1: createClassPage([schoolClass]),
    })

    renderPage()

    expect(
      await screen.findByRole('heading', { name: /danh sách lớp học/i }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Tiếng Anh 6A')).toBeInTheDocument()
    expect(screen.getByText('class-1')).toBeInTheDocument()
    expect(screen.getByText(formatClassDate(schoolClass.createdAt))).toBeInTheDocument()
    expect(screen.getAllByText('Đang hoạt động').length).toBeGreaterThan(0)
    expect(screen.getByRole('columnheader', { name: /id lớp/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /ngày tạo/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: /ngôn ngữ/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: /khối lớp/i }),
    ).not.toBeInTheDocument()

    const queries = mockedPost.mock.calls.map((call) => {
      const request = call[1] as { query: string }

      return request.query
    })

    expect(queries.some((query) => query.includes('schoolClassUsers'))).toBe(
      false,
    )
    expect(
      queries.some(
        (query) =>
          query.includes('schoolClass(') && !query.includes('schoolClasses'),
      ),
    ).toBe(false)
  })

  it('does not show future-update copy on the page', async () => {
    mockGraphQLSuccess({
      1: createClassPage([createClass()]),
    })

    renderPage()

    await screen.findByText('Tiếng Anh 6A')

    expect(screen.queryByText(/cập nhật tiếp theo/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/bước tiếp theo/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/soft-delete/i)).not.toBeInTheDocument()
  })

  it('sends filters in the class list query and resets to page one', async () => {
    mockGraphQLSuccess({
      1: createClassPage([createClass()], {
        totalElements: 2,
        totalPages: 2,
      }),
      2: createClassPage(
        [createClass({ id: 'class-2', name: 'Trang Hai' })],
        {
          page: 2,
          totalElements: 2,
          totalPages: 2,
        },
      ),
    })
    const user = userEvent.setup()

    renderPage()

    await screen.findByText('Tiếng Anh 6A')
    await user.click(screen.getByRole('button', { name: /sau/i }))
    await screen.findByText('Trang Hai')
    await user.type(screen.getByLabelText(/tìm kiếm/i), 'abc')

    await waitFor(() => {
      const listRequests = mockedPost.mock.calls
        .map(
          (call) =>
            call[1] as { query: string; variables: Record<string, unknown> },
        )
        .filter((request) => request.query.includes('schoolClasses'))

      expect(listRequests.at(-1)?.variables).toMatchObject({
        page: 1,
        search: 'abc',
      })
    })
  })

  it('shows a user-facing error when creating without a configured school', async () => {
    setSchoolId('')
    mockGraphQLSuccess({
      1: createClassPage([]),
    })
    const user = userEvent.setup()

    renderPage()

    await screen.findByText(/chưa có lớp học/i)
    await user.click(screen.getByRole('button', { name: /tạo lớp/i }))

    const dialog = screen.getByRole('dialog', { name: /tạo lớp học/i })

    await user.type(within(dialog).getByLabelText(/mã lớp/i), 'ENG-6A')
    await user.type(within(dialog).getByLabelText(/tên lớp/i), 'Tiếng Anh 6A')
    await user.type(within(dialog).getByLabelText(/id ngôn ngữ/i), languageId)
    await user.type(within(dialog).getByLabelText(/id khối lớp/i), gradeId)
    await user.click(
      within(dialog).getByRole('button', { name: /lưu lớp học/i }),
    )

    expect(
      await within(dialog).findByText(
        /chưa xác định được trường học hiện tại/i,
      ),
    ).toBeInTheDocument()
    expect(within(dialog).queryByText(/vite_school_id/i)).not.toBeInTheDocument()
    expect(mockedRestPost).not.toHaveBeenCalled()
  })

  it('creates a class with relaxed uuid validation and invalidates the list', async () => {
    mockGraphQLSuccess({
      1: createClassPage([]),
    })
    mockedRestPost.mockResolvedValue({
      data: {
        data: { schoolClassId: 'class-1' },
        message: 'Đã tạo lớp học',
      },
    } as AxiosResponse<ApiResponse<{ schoolClassId: string }>>)
    const user = userEvent.setup()

    renderPage()

    await screen.findByText(/chưa có lớp học/i)
    await user.click(screen.getByRole('button', { name: /tạo lớp/i }))

    const dialog = screen.getByRole('dialog', { name: /tạo lớp học/i })

    await user.type(within(dialog).getByLabelText(/mã lớp/i), 'ENG-6A')
    await user.type(within(dialog).getByLabelText(/tên lớp/i), 'Tiếng Anh 6A')
    await user.type(within(dialog).getByLabelText(/id ngôn ngữ/i), languageId)
    await user.type(within(dialog).getByLabelText(/id khối lớp/i), gradeId)
    await user.click(
      within(dialog).getByRole('button', { name: /lưu lớp học/i }),
    )

    await waitFor(() => {
      expect(mockedRestPost).toHaveBeenCalledWith(
        `/v1/schools/${schoolId}/classes`,
        {
          code: 'ENG-6A',
          description: null,
          languageId,
          name: 'Tiếng Anh 6A',
          schoolGradeId: gradeId,
        },
      )
    })
    expect(await screen.findByText('Đã tạo lớp học')).toBeInTheDocument()
  })

  it('edits and deletes a class from the action menu', async () => {
    mockGraphQLSuccess({
      1: createClassPage([createClass()]),
    })
    mockedRestDelete.mockResolvedValue({
      data: {
        data: {
          deleteType: 'SOFT',
          id: 'class-1',
          status: 'ARCHIVED',
          updatedAt: '2026-06-10T00:00:00Z',
        },
        message: 'Đã xóa lớp học',
      },
    } as AxiosResponse<ApiResponse<unknown>>)
    const user = userEvent.setup()

    renderPage()

    await screen.findByText('Tiếng Anh 6A')
    let menu = await openClassActionMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: /sửa lớp/i }))

    const editDialog = screen.getByRole('dialog', {
      name: /cập nhật lớp học/i,
    })

    await user.clear(within(editDialog).getByLabelText(/tên lớp/i))
    await user.type(
      within(editDialog).getByLabelText(/tên lớp/i),
      'Tiếng Anh 6A mới',
    )
    await user.click(
      within(editDialog).getByRole('button', { name: /lưu lớp học/i }),
    )

    await waitFor(() => {
      const mutationRequest = mockedPost.mock.calls
        .map(
          (call) =>
            call[1] as { query: string; variables: Record<string, unknown> },
        )
        .find((request) => request.query.includes('updateSchoolClass'))

      expect(mutationRequest?.variables).toMatchObject({
        id: 'class-1',
        input: {
          name: 'Tiếng Anh 6A mới',
          status: 'ACTIVE',
        },
      })
    })

    menu = await openClassActionMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: /xóa lớp/i }))

    const deleteDialog = screen.getByRole('dialog', { name: /xóa lớp học/i })

    expect(screen.queryByText(/soft-delete/i)).not.toBeInTheDocument()
    await user.click(
      within(deleteDialog).getByRole('button', { name: /xóa lớp/i }),
    )

    await waitFor(() => {
      expect(mockedRestDelete).toHaveBeenCalledWith(
        `/v1/schools/${schoolId}/classes/class-1`,
      )
    })
  })
})
