import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { SystemAdminRegistrationsPage } from './SystemAdminRegistrationsPage'
import type {
  ApproveRegisterFormRequest,
  RegisterForm,
  RegisterFormPage,
} from '../types'

jest.mock('../api/useVietnamProvincesQuery', () => ({
  useVietnamProvincesQuery: () => ({
    data: [
      { code: 1, name: 'Hà Nội' },
      { code: 79, name: 'TP. Hồ Chí Minh' },
    ],
    isError: false,
    isLoading: false,
  }),
}))

const mockedPost = jest.spyOn(graphqlApiClient, 'post')
const mockedRestPost = jest.spyOn(apiClient, 'post')

type ApiResponse<T> = {
  data: T
  message: string
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

function createRegisterForm(
  overrides: Partial<RegisterForm> = {},
): RegisterForm {
  return {
    contactAddress: '27 test street',
    contactEmail: 'gocthanh9799@gmail.com',
    contactFullName: 'Tran Chan Quang Thien',
    contactPhone: '0355906225',
    dateOfBirth: '2004-09-05',
    documents: null,
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
    verificationMethod: null,
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

function mockRestSuccess(message: string) {
  mockedRestPost.mockResolvedValue({
    data: {
      data: null,
      message,
    },
  } as AxiosResponse<ApiResponse<null>>)
}

async function openRowActionMenu(user: ReturnType<typeof userEvent.setup>, row: HTMLElement) {
  await user.click(
    within(row).getByRole('button', { name: /mở hành động/i }),
  )
}

describe('SystemAdminRegistrationsPage', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockedRestPost.mockReset()
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

    await openRowActionMenu(user, secondRow)
    await user.click(screen.getByRole('menuitem', { name: /xem chi tiết/i }))

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

  it('keeps unsupported controls disabled and enables pending decision actions', async () => {
    mockGraphQLSuccess({
      1: createRegisterFormPage([createRegisterForm()]),
    })
    const user = userEvent.setup()

    renderPage()

    await screen.findByText('Tran Chan Quang Thien')
    const row = screen.getByText('Tran Chan Quang Thien').closest('tr')

    if (!row) {
      throw new Error('Expected the registration row to render')
    }

    expect(
      screen.getByRole('button', { name: /tất cả trạng thái/i }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /01\/05\/2024 - 31\/05\/2024/i }),
    ).toBeDisabled()

    await openRowActionMenu(user, row)

    expect(screen.getByRole('menuitem', { name: /xem chi tiết/i })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: /^duyệt$/i })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: /^từ chối$/i })).toBeEnabled()
  })

  it('disables decision actions for processed register forms', async () => {
    const approvedForm = createRegisterForm({
      contactFullName: 'Approved Contact',
      id: 'form-approved',
      status: 'APPROVED',
    })
    const rejectedForm = createRegisterForm({
      contactFullName: 'Rejected Contact',
      id: 'form-rejected',
      status: 'REJECTED',
    })

    mockGraphQLSuccess({
      1: createRegisterFormPage([approvedForm, rejectedForm], {
        totalElements: 2,
      }),
    })
    const user = userEvent.setup()

    renderPage()

    await screen.findByText('Approved Contact')

    const approvedRow = screen.getByText('Approved Contact').closest('tr')
    const rejectedRow = screen.getByText('Rejected Contact').closest('tr')

    if (!approvedRow || !rejectedRow) {
      throw new Error('Expected processed registration rows to render')
    }

    await openRowActionMenu(user, approvedRow)

    expect(screen.getByRole('menuitem', { name: /^duyệt/i })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: /^từ chối/i })).toBeDisabled()
    expect(
      screen.getAllByText('Chỉ có thể xử lý đơn đăng ký đang chờ duyệt').length,
    ).toBeGreaterThan(0)

    await user.keyboard('{Escape}')
    await openRowActionMenu(user, rejectedRow)

    expect(screen.getByRole('menuitem', { name: /^duyệt/i })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: /^từ chối/i })).toBeDisabled()
    expect(
      screen.getAllByText('Chỉ có thể xử lý đơn đăng ký đang chờ duyệt').length,
    ).toBeGreaterThan(0)
  })

  it('rejects a pending register form after confirmation', async () => {
    const successMessage = 'Đơn đăng ký đã từ chối thành công'
    const listCalls = mockGraphQLSuccess({
      1: createRegisterFormPage([createRegisterForm()]),
    })
    mockRestSuccess(successMessage)
    const user = userEvent.setup()

    renderPage()

    await screen.findByText('Tran Chan Quang Thien')
    const row = screen.getByText('Tran Chan Quang Thien').closest('tr')

    if (!row) {
      throw new Error('Expected the registration row to render')
    }

    await openRowActionMenu(user, row)
    await user.click(screen.getByRole('menuitem', { name: /^từ chối$/i }))

    const dialog = screen.getByRole('dialog', {
      name: /từ chối đơn đăng ký/i,
    })

    await user.type(
      within(dialog).getByLabelText(/lý do từ chối/i),
      'Thông tin chưa đủ để xác minh',
    )
    await user.click(
      within(dialog).getByRole('button', { name: /tiếp tục từ chối/i }),
    )
    await user.click(
      within(dialog).getByRole('button', { name: /xác nhận từ chối/i }),
    )

    await waitFor(() => {
      expect(mockedRestPost).toHaveBeenCalledWith(
        '/v1/register-forms/form-1/reject',
        {
          reason: 'Thông tin chưa đủ để xác minh',
          registerFormId: 'form-1',
        },
      )
    })
    expect(await screen.findByText(successMessage)).toBeInTheDocument()
    expect(listCalls.length).toBeGreaterThan(1)
  })

  it('approves a pending register form with editable payload after confirmation', async () => {
    const successMessage = 'Đơn đăng ký đã được phê duyệt'
    const listCalls = mockGraphQLSuccess({
      1: createRegisterFormPage([createRegisterForm()]),
    })
    mockRestSuccess(successMessage)
    const user = userEvent.setup()

    renderPage()

    await screen.findByText('Tran Chan Quang Thien')
    const row = screen.getByText('Tran Chan Quang Thien').closest('tr')

    if (!row) {
      throw new Error('Expected the registration row to render')
    }

    await openRowActionMenu(user, row)
    await user.click(screen.getByRole('menuitem', { name: /^duyệt$/i }))

    const dialog = screen.getByRole('dialog', {
      name: /duyệt đơn đăng ký/i,
    })

    await user.type(within(dialog).getByLabelText(/mã trường/i), 'VOX001')
    await user.selectOptions(
      within(dialog).getByLabelText(/tỉnh \/ thành phố/i),
      '79',
    )
    await user.click(
      within(dialog).getByRole('button', { name: /tiếp tục duyệt/i }),
    )
    await user.click(
      within(dialog).getByRole('button', { name: /xác nhận duyệt/i }),
    )

    await waitFor(() => {
      expect(mockedRestPost).toHaveBeenCalledWith(
        '/v1/register-forms/form-1/approve',
        expect.any(Object),
      )
    })

    const payload = mockedRestPost.mock
      .calls[0][1] as ApproveRegisterFormRequest

    expect(payload).toEqual({
      description: null,
      provinceCode: '79',
      registerFormId: 'form-1',
      schoolCode: 'VOX001',
    })
    expect(await screen.findByText(successMessage)).toBeInTheDocument()
    expect(listCalls.length).toBeGreaterThan(1)
  })

  it('does not move to confirmation when approve validation fails', async () => {
    mockGraphQLSuccess({
      1: createRegisterFormPage([createRegisterForm()]),
    })
    const user = userEvent.setup()

    renderPage()

    await screen.findByText('Tran Chan Quang Thien')
    const row = screen.getByText('Tran Chan Quang Thien').closest('tr')

    if (!row) {
      throw new Error('Expected the registration row to render')
    }

    await openRowActionMenu(user, row)
    await user.click(screen.getByRole('menuitem', { name: /^duyệt$/i }))

    const dialog = screen.getByRole('dialog', {
      name: /duyệt đơn đăng ký/i,
    })

    await user.type(within(dialog).getByLabelText(/mã trường/i), '   ')
    await user.selectOptions(
      within(dialog).getByLabelText(/tỉnh \/ thành phố/i),
      '79',
    )
    await user.click(
      within(dialog).getByRole('button', { name: /tiếp tục duyệt/i }),
    )

    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      /mã trường không được để trống/i,
    )
    expect(
      within(dialog).queryByRole('button', { name: /xác nhận duyệt/i }),
    ).not.toBeInTheDocument()
    expect(mockedRestPost).not.toHaveBeenCalled()
  })
})
