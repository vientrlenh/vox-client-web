import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { appConfig } from '@/shared/config/env'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ClassUser, PageResult, SchoolClass } from '../types'
import { SchoolAdminClassesPage } from './SchoolAdminClassesPage'

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

const languageId = '11111111-1111-4111-8111-111111111111'
const gradeId = '22222222-2222-4222-8222-222222222222'
const schoolId = '33333333-3333-4333-8333-333333333333'
const userId = '44444444-4444-4444-8444-444444444444'

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
    description: 'Morning class',
    id: 'class-1',
    languageId,
    name: 'English 6A',
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

function createClassUser(overrides: Partial<ClassUser> = {}): ClassUser {
  return {
    assignedBy: null,
    id: 'class-user-1',
    isActive: true,
    joinedAt: '2026-06-03T00:00:00Z',
    leftAt: null,
    schoolClassId: 'class-1',
    user: {
      email: 'student@vox.edu.vn',
      fullName: 'Student One',
      id: userId,
      phone: '0900000000',
    },
    userId,
    ...overrides,
  }
}

function renderPage() {
  return renderWithProviders(<SchoolAdminClassesPage />, {
    queryClient: createQueryClient(),
  })
}

function mockGraphQLSuccess(
  pages: Record<number, PageResult<SchoolClass>>,
  users: PageResult<ClassUser> = {
    content: [createClassUser()],
    page: 1,
    size: 6,
    totalElements: 1,
    totalPages: 1,
  },
) {
  mockedPost.mockImplementation((_path, body) => {
    const request = body as {
      query: string
      variables?: Record<string, unknown>
    }
    const page = Number(request.variables?.page ?? 1)
    const classId = String(request.variables?.id ?? request.variables?.schoolClassId ?? '')
    const allClasses = Object.values(pages).flatMap(
      (pageData) => pageData.content,
    )

    if (request.query.includes('schoolClassUsers')) {
      return Promise.resolve({
        data: {
          data: {
            schoolClassUsers: users,
          },
        },
      })
    }

    if (request.query.includes('schoolClasses')) {
      return Promise.resolve({
        data: {
          data: {
            schoolClasses: pages[page] ?? createClassPage([]),
          },
        },
      })
    }

    if (request.query.includes('updateSchoolClass')) {
      return Promise.resolve({
        data: {
          data: {
            updateSchoolClass: { schoolClassId: classId },
          },
        },
      })
    }

    return Promise.resolve({
      data: {
        data: {
          schoolClass:
            allClasses.find((schoolClass) => schoolClass.id === classId) ??
            null,
        },
      },
    })
  })
}

describe('SchoolAdminClassesPage', () => {
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

    expect(screen.getByText(/loading classes/i)).toBeInTheDocument()
  })

  it('renders the empty state', async () => {
    mockGraphQLSuccess({
      1: createClassPage([]),
    })

    renderPage()

    expect(await screen.findByText(/no classes found/i)).toBeInTheDocument()
    expect(
      screen.getByText(/select a class to view details/i),
    ).toBeInTheDocument()
  })

  it('renders classes, selected detail, and users', async () => {
    mockGraphQLSuccess({
      1: createClassPage([createClass()]),
    })

    renderPage()

    expect(
      await screen.findByRole('heading', { name: /manage school classes/i }),
    ).toBeInTheDocument()
    expect((await screen.findAllByText('English 6A')).length).toBeGreaterThan(0)
    expect(screen.getByText('Morning class')).toBeInTheDocument()
    expect(await screen.findByText('Student One')).toBeInTheDocument()
  })

  it('sends filters in the class list query and resets to page one', async () => {
    mockGraphQLSuccess({
      1: createClassPage([createClass()], {
        totalElements: 2,
        totalPages: 2,
      }),
      2: createClassPage([createClass({ id: 'class-2', name: 'Page Two' })], {
        page: 2,
        totalElements: 2,
        totalPages: 2,
      }),
    })
    const user = userEvent.setup()

    renderPage()

    await screen.findAllByText('English 6A')
    await user.click(screen.getByRole('button', { name: /next/i }))
    await screen.findAllByText('Page Two')
    await user.type(screen.getByLabelText(/search/i), 'abc')

    await waitFor(() => {
      const listRequests = mockedPost.mock.calls
        .map((call) => call[1] as { query: string; variables: Record<string, unknown> })
        .filter((request) => request.query.includes('schoolClasses'))

      expect(listRequests.at(-1)?.variables).toMatchObject({
        page: 1,
        search: 'abc',
      })
    })
  })

  it('shows a clear error when creating without VITE_SCHOOL_ID', async () => {
    setSchoolId('')
    mockGraphQLSuccess({
      1: createClassPage([]),
    })
    const user = userEvent.setup()

    renderPage()

    await screen.findByText(/no classes found/i)
    await user.click(screen.getByRole('button', { name: /new class/i }))

    const dialog = screen.getByRole('dialog', { name: /create class/i })

    await user.type(within(dialog).getByLabelText(/class code/i), 'ENG-6A')
    await user.type(within(dialog).getByLabelText(/class name/i), 'English 6A')
    await user.type(within(dialog).getByLabelText(/language id/i), languageId)
    await user.type(within(dialog).getByLabelText(/school grade id/i), gradeId)
    await user.click(within(dialog).getByRole('button', { name: /save class/i }))

    expect(
      await within(dialog).findByText(/missing vite_school_id/i),
    ).toBeInTheDocument()
    expect(mockedRestPost).not.toHaveBeenCalled()
  })

  it('creates a class and invalidates the list', async () => {
    mockGraphQLSuccess({
      1: createClassPage([]),
    })
    mockedRestPost.mockResolvedValue({
      data: {
        data: { schoolClassId: 'class-1' },
        message: 'Created',
      },
    } as AxiosResponse<ApiResponse<{ schoolClassId: string }>>)
    const user = userEvent.setup()

    renderPage()

    await screen.findByText(/no classes found/i)
    await user.click(screen.getByRole('button', { name: /new class/i }))

    const dialog = screen.getByRole('dialog', { name: /create class/i })

    await user.type(within(dialog).getByLabelText(/class code/i), 'ENG-6A')
    await user.type(within(dialog).getByLabelText(/class name/i), 'English 6A')
    await user.type(within(dialog).getByLabelText(/language id/i), languageId)
    await user.type(within(dialog).getByLabelText(/school grade id/i), gradeId)
    await user.click(within(dialog).getByRole('button', { name: /save class/i }))

    await waitFor(() => {
      expect(mockedRestPost).toHaveBeenCalledWith(
        `/v1/schools/${schoolId}/classes`,
        {
          code: 'ENG-6A',
          description: null,
          languageId,
          name: 'English 6A',
          schoolGradeId: gradeId,
        },
      )
    })
    expect(await screen.findByText('Created')).toBeInTheDocument()
  })

  it('updates, deletes, and manages class users', async () => {
    mockGraphQLSuccess({
      1: createClassPage([createClass()]),
    })
    mockedRestDelete.mockResolvedValue({
      data: {
        data: { schoolClassId: 'class-1' },
        message: 'Removed',
      },
    } as AxiosResponse<ApiResponse<unknown>>)
    mockedRestPatch.mockResolvedValue({
      data: {
        data: { schoolClassId: 'class-1' },
        message: 'User updated',
      },
    } as AxiosResponse<ApiResponse<unknown>>)
    mockedRestPost.mockResolvedValue({
      data: {
        data: { schoolClassUserId: 'class-user-2' },
        message: 'User added',
      },
    } as AxiosResponse<ApiResponse<unknown>>)
    const user = userEvent.setup()

    renderPage()

    await screen.findByText('Student One')
    await user.click(screen.getByRole('button', { name: /deactivate/i }))

    await waitFor(() => {
      expect(mockedRestPatch).toHaveBeenCalledWith(
        `/v1/schools/${schoolId}/classes/class-1/users/${userId}/status`,
        { isActive: false },
      )
    })

    await user.click(screen.getByRole('button', { name: /remove/i }))

    await waitFor(() => {
      expect(mockedRestDelete).toHaveBeenCalledWith(
        `/v1/schools/${schoolId}/classes/class-1/users/${userId}`,
      )
    })

    await user.click(screen.getByRole('button', { name: /^add$/i }))
    const addDialog = screen.getByRole('dialog', { name: /add user to class/i })

    await user.type(within(addDialog).getByLabelText(/user id/i), userId)
    await user.click(within(addDialog).getByRole('button', { name: /add user/i }))

    await waitFor(() => {
      expect(mockedRestPost).toHaveBeenCalledWith(
        `/v1/schools/${schoolId}/classes/class-1/users`,
        { userId },
      )
    })
  })
})
