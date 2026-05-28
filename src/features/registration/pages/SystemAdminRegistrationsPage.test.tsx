import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { SystemAdminRegistrationsPage } from './SystemAdminRegistrationsPage'
import type { RegisterForm, RegisterFormPage } from '../types'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

function createRegisterForm(
  overrides: Partial<RegisterForm> = {},
): RegisterForm {
  return {
    contactAddress: '27 test street',
    contactEmail: 'gocthanh9799@gmail.com',
    contactFullName: 'Tran Chan Quang Thien',
    contactPhone: '0355906225',
    dateOfBirth: '2004-09-05',
    id: 'form-1',
    identityNumber: '079384563728',
    position: 'Pho hieu truong',
    postalCode: '70000',
    reason: null,
    schoolAddress: '27 test street',
    schoolDomain: 'testschool.edu.vn',
    schoolName: 'test-school-1',
    status: 'PENDING',
    studentCount: 3000,
    ...overrides,
  }
}

function createRegisterFormPage(
  content: RegisterForm[],
  overrides: Partial<RegisterFormPage> = {},
): RegisterFormPage {
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
  return renderWithProviders(<SystemAdminRegistrationsPage />, {
    queryClient: createQueryClient(),
  })
}

function mockGraphQLSuccess(pages: Record<number, RegisterFormPage>) {
  const listCalls: number[] = []

  mockedPost.mockImplementation((_path, body) => {
    const request = body as {
      query: string
      variables?: Record<string, unknown>
    }
    const page = Number(request.variables?.page ?? 1)
    const id = String(request.variables?.id ?? '')

    if (request.query.includes('registerForms')) {
      listCalls.push(page)

      return Promise.resolve({
        data: {
          data: {
            registerForms: pages[page] ?? createRegisterFormPage([]),
          },
        },
      })
    }

    const allForms = Object.values(pages).flatMap((pageData) => pageData.content)

    return Promise.resolve({
      data: {
        data: {
          registerForm: allForms.find((form) => form.id === id) ?? null,
        },
      },
    })
  })

  return listCalls
}

describe('SystemAdminRegistrationsPage', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('renders the loading state', () => {
    mockedPost.mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(
      screen.getByText(/đang tải danh sách đơn đăng ký/i),
    ).toBeInTheDocument()
  })

  it('renders the empty state', async () => {
    mockGraphQLSuccess({
      1: createRegisterFormPage([]),
    })

    renderPage()

    expect(await screen.findByText(/chưa có đơn đăng ký/i)).toBeInTheDocument()
    expect(
      screen.getByText(/chọn một đơn đăng ký để xem chi tiết/i),
    ).toBeInTheDocument()
  })

  it('renders the error state from GraphQL errors', async () => {
    mockedPost.mockResolvedValue({
      data: {
        errors: [{ message: 'Forbidden' }],
      },
    })

    renderPage()

    expect(await screen.findByText('Forbidden')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument()
  })

  it('renders list rows and the selected detail panel', async () => {
    mockGraphQLSuccess({
      1: createRegisterFormPage([createRegisterForm()]),
    })

    renderPage()

    expect(
      await screen.findByRole('heading', { name: /quản lý đơn đăng ký/i }),
    ).toBeInTheDocument()
    expect(
      (await screen.findAllByText('Tran Chan Quang Thien')).length,
    ).toBeGreaterThan(0)
    expect(
      (await screen.findAllByText('gocthanh9799@gmail.com')).length,
    ).toBeGreaterThan(0)
    expect(await screen.findByText('05/09/2004')).toBeInTheDocument()
    expect(screen.getByText('3.000')).toBeInTheDocument()
  })

  it('loads a different detail when selecting another row', async () => {
    const secondForm = createRegisterForm({
      contactAddress: '456 school street',
      contactEmail: 'second@school.edu.vn',
      contactFullName: 'Nguyen Thi B',
      id: 'form-2',
      schoolName: 'test-school-2',
    })
    mockGraphQLSuccess({
      1: createRegisterFormPage([createRegisterForm(), secondForm], {
        totalElements: 2,
      }),
    })
    const user = userEvent.setup()

    renderPage()

    await screen.findByText('Nguyen Thi B')
    const secondRow = screen.getByText('Nguyen Thi B').closest('tr')

    if (!secondRow) {
      throw new Error('Expected the second registration row to render')
    }

    await user.click(
      within(secondRow).getByRole('button', { name: /xem chi tiết/i }),
    )

    expect(await screen.findByText('456 school street')).toBeInTheDocument()
  })

  it('changes pages with pagination controls', async () => {
    const firstForm = createRegisterForm()
    const secondForm = createRegisterForm({
      contactFullName: 'Le Page Two',
      id: 'form-2',
      schoolName: 'page-two-school',
    })
    const listCalls = mockGraphQLSuccess({
      1: createRegisterFormPage([firstForm], {
        totalElements: 2,
        totalPages: 2,
      }),
      2: createRegisterFormPage([secondForm], {
        page: 2,
        totalElements: 2,
        totalPages: 2,
      }),
    })
    const user = userEvent.setup()

    renderPage()

    await screen.findByText('Tran Chan Quang Thien')
    await user.click(screen.getByRole('button', { name: /trang sau/i }))

    expect((await screen.findAllByText('Le Page Two')).length).toBeGreaterThan(
      0,
    )
    expect(listCalls).toContain(2)

    await user.click(screen.getByRole('button', { name: /trang trước/i }))

    expect(
      (await screen.findAllByText('Tran Chan Quang Thien')).length,
    ).toBeGreaterThan(0)
    expect(listCalls.filter((page) => page === 1).length).toBeGreaterThan(1)
  })

  it('refreshes the register form list', async () => {
    const listCalls = mockGraphQLSuccess({
      1: createRegisterFormPage([createRegisterForm()]),
    })
    const user = userEvent.setup()

    renderPage()

    await screen.findByText('Tran Chan Quang Thien')
    await user.click(screen.getByRole('button', { name: /làm mới/i }))

    await waitFor(() => {
      expect(listCalls.length).toBeGreaterThan(1)
    })
  })

  it('keeps unsupported controls and action buttons disabled in v1', async () => {
    mockGraphQLSuccess({
      1: createRegisterFormPage([createRegisterForm()]),
    })

    renderPage()

    await screen.findByText('Tran Chan Quang Thien')

    expect(
      screen.getByRole('button', { name: /tất cả trạng thái/i }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /01\/05\/2024 - 31\/05\/2024/i }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: /xuất dữ liệu/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^duyệt$/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /từ chối/i })).toBeDisabled()
  })
})
