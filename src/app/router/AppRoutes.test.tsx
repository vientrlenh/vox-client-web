import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { saveAuthTokens } from '@/features/auth/session/authSession'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AppRoutes } from './AppRoutes'

const mockedGraphqlPost = jest.spyOn(graphqlApiClient, 'post')

/**
 * Các trang dashboard chỉ hiện nội dung khi query đầu tiên xong. Client mặc định của app retry 1
 * lần, nên một query không được mock sẽ kéo dài trạng thái loading quá thời gian chờ của test.
 */
function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function createJwt(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

function saveSystemAdminSession() {
  const accessToken = createJwt({
    email: 'admin@vox.edu.vn',
    exp: Math.floor(Date.now() / 1000) + 3600,
    roles: ['SYSTEM_ADMIN'],
    userId: 'user-1',
  })

  saveAuthTokens({
    accessToken,
  })
}

function saveSchoolAdminSession() {
  const accessToken = createJwt({
    email: 'school-admin@vox.edu.vn',
    exp: Math.floor(Date.now() / 1000) + 3600,
    roles: ['SCHOOL_ADMIN'],
    userId: 'school-user-1',
  })

  saveAuthTokens({
    accessToken,
  })
}

function mockClassManagementGraphql() {
  mockedGraphqlPost.mockResolvedValue({
    data: {
      data: {
        schoolClasses: {
          content: [],
          page: 1,
          size: 10,
          totalElements: 0,
          totalPages: 0,
        },
      },
    },
  })
}

function mockLanguageManagementGraphql() {
  mockedGraphqlPost.mockResolvedValue({
    data: {
      data: {
        supportedLanguages: {
          content: [],
          page: 1,
          size: 10,
          totalElements: 0,
          totalPages: 0,
        },
      },
    },
  })
}

/**
 * Chỉ đủ để trang thoát khỏi nhánh loading/error — bài test này kiểm tra ROUTE và LAYOUT, số liệu
 * trên dashboard đã có test riêng của từng trang lo.
 */
function mockSystemAdminDashboardGraphql() {
  mockedGraphqlPost.mockImplementation((_path, body) => {
    const request = body as { query: string }

    if (request.query.includes('platformOperationalHealth')) {
      return Promise.resolve({
        data: {
          data: {
            platformOperationalHealth: {
              daily: [],
              examsInProgress: 0,
              graded: 0,
              gradingFailed: 0,
              gradingQueueDepth: 0,
              sessionsInProgress: 0,
              successRatePercent: null,
            },
          },
        },
      })
    }

    if (request.query.includes('platformBusinessHealth')) {
      return Promise.resolve({
        data: {
          data: {
            platformBusinessHealth: {
              aiCostVnd: 0,
              expiringSoonSchools: 0,
              grossMarginPercent: null,
              lapsedSchools: 0,
              previousGrossMarginPercent: null,
              previousRevenueVnd: 0,
              revenueVnd: 0,
              schoolsInDebt: 0,
              subscribedSchools: 0,
              suspendedSchools: 0,
            },
          },
        },
      })
    }

    return Promise.resolve({
      data: {
        data: {
          systemAdminDashboard: {
            activeFrameworkCount: 0,
            activeSchools: 0,
            inactiveSchools: 0,
            monthlyRevenue: [],
            oldestPendingRegistrationDays: null,
            pendingRegistrations: 0,
            registrationsLast30Days: 0,
            registrationsLast90Days: 0,
            schoolAdminCount: 0,
            studentCount: 0,
            systemRubricCount: 0,
            teacherCount: 0,
            totalRevenue: 0,
            totalSchools: 0,
          },
        },
      },
    })
  })
}

function mockSchoolAdminDashboardGraphql() {
  mockedGraphqlPost.mockImplementation((_path, body) => {
    const request = body as { query: string }

    if (!request.query.includes('schoolAdminDashboard')) {
      return Promise.resolve({ data: { data: { examStatusCounts: null } } })
    }

    return Promise.resolve({
      data: {
        data: {
          schoolAdminDashboard: {
            appealStats: { pending: 0, processing: 0, published: 0, rejected: 0 },
            examStatusCounts: {
              cancelled: 0,
              closed: 0,
              draft: 0,
              inProgress: 0,
              resultsPublished: 0,
              scheduled: 0,
              total: 0,
            },
            examsAwaitingPublish: [],
            funding: {
              balanceVnd: '0',
              examQuotaRemainingVnd: '12000000',
              examQuotaTotalVnd: '12000000',
              locked: false,
              spendableVnd: '12000000',
            },
            monthlySpending: [],
            oldestPendingAppealDays: null,
            revenue: 0,
            subscriptionRenewal: {
              endDate: '2026-12-31',
              planName: 'Gói Chuẩn',
              status: 'ACTIVE',
            },
            tokenAllocated: 0,
            tokenUsed: 0,
            unscored: {
              aiFailed: 0,
              aiFailedNoRetryLeft: 0,
              aiFailedRetryLeft: 0,
              assignedInProgress: 0,
              assignedOverdue: 0,
              awaitingAssignment: 0,
              examCount: 0,
              oldestWaitingDays: null,
              total: 0,
            },
          },
        },
      },
    })
  })
}

function mockClassDetailGraphql() {
  mockedGraphqlPost.mockImplementation((_path, body) => {
    const request = body as { query: string }

    if (request.query.includes('schoolClassUsers')) {
      return Promise.resolve({
        data: {
          data: {
            schoolClassUsers: {
              content: [],
              page: 1,
              size: 10,
              totalElements: 0,
              totalPages: 0,
            },
          },
        },
      })
    }

    return Promise.resolve({
      data: {
        data: {
          schoolClass: {
            code: 'ENG-6A',
            createdAt: '2026-06-01T00:00:00Z',
            description: 'Lớp buổi sáng',
            id: 'class-1',
            languageId: '01890f44-0c7a-7cc1-bc3b-2e7f4f001234',
            name: 'Tiếng Anh 6A',
            schoolGradeId: '11111111-1111-0111-0111-111111111111',
            schoolId: '33333333-3333-4333-8333-333333333333',
            status: 'ACTIVE',
            updatedAt: '2026-06-02T00:00:00Z',
          },
        },
      },
    })
  })
}

describe('AppRoutes', () => {
  beforeEach(() => {
    localStorage.clear()
    mockedGraphqlPost.mockReset()
  })

  it('renders the index route', async () => {
    renderWithProviders(<AppRoutes />)

    expect(
      await screen.findByRole('heading', {
        name: /đánh giá kỹ năng nói thông minh hơn/i,
      }),
    ).toBeInTheDocument()
  })

  /**
   * Trước đây mọi đường dẫn lạ bị ném về trang chủ, tức trang giới thiệu công khai -- gõ nhầm một
   * chữ là màn hình biến thành trang tiếp thị, trông y như vừa bị đăng xuất.
   */
  it('shows the not found page for an unknown route', async () => {
    renderWithProviders(<AppRoutes />, { route: '/khong-co-duong-dan-nay' })

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /không tìm thấy trang này/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('/khong-co-duong-dan-nay')).toBeInTheDocument()
  })

  it('renders the login route', async () => {
    renderWithProviders(<AppRoutes />, { route: '/login' })

    expect(
      await screen.findByRole('heading', { name: /đăng nhập/i }),
    ).toBeInTheDocument()
  })

  it('renders the register route', async () => {
    renderWithProviders(<AppRoutes />, { route: '/register' })

    expect(
      await screen.findByRole('heading', {
        name: /đăng ký tài khoản trường học/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the reset password route', async () => {
    renderWithProviders(<AppRoutes />, { route: '/reset-password' })

    expect(
      await screen.findByRole('heading', { name: /đặt lại mật khẩu/i }),
    ).toBeInTheDocument()
  })

  it('renders the setup password route', async () => {
    renderWithProviders(<AppRoutes />, {
      route:
        '/setup-password?userId=f8635b2c-8770-49a0-9cf7-b6581a1bdc22&token=GPa444LUenTtdkEd8CsQCtmPd8S3xGrW',
    })

    expect(
      await screen.findByRole('heading', { name: /thiết lập mật khẩu/i }),
    ).toBeInTheDocument()
  })

  it('redirects unauthenticated users from the system admin dashboard to login', async () => {
    renderWithProviders(<AppRoutes />, { route: '/system-admin/dashboard' })

    expect(
      await screen.findByRole('heading', { name: /đăng nhập/i }),
    ).toBeInTheDocument()
  })

  it('redirects unauthenticated users from school admin classes to login', async () => {
    renderWithProviders(<AppRoutes />, { route: '/school-admin/classes' })

    expect(
      await screen.findByRole('heading', { name: /đăng nhập/i }),
    ).toBeInTheDocument()
  })

  it('redirects unauthenticated users from school admin class detail to login', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/school-admin/classes/class-1',
    })

    expect(
      await screen.findByRole('heading', { name: /chào mừng trở lại/i }),
    ).toBeInTheDocument()
  })

  it('redirects unauthenticated users from school admin class import to login', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/school-admin/classes/import',
    })

    expect(
      await screen.findByRole('heading', { name: /chào mừng trở lại/i }),
    ).toBeInTheDocument()
  })

  it('redirects unauthenticated users from school admin class user import to login', async () => {
    renderWithProviders(<AppRoutes />, {
      route: '/school-admin/classes/class-1/users/import',
    })

    expect(
      await screen.findByRole('heading', { name: /chào mừng trở lại/i }),
    ).toBeInTheDocument()
  })

  it('redirects unauthenticated users from school admin dashboard to login', async () => {
    renderWithProviders(<AppRoutes />, { route: '/school-admin/dashboard' })

    expect(
      await screen.findByRole('heading', { name: /đăng nhập/i }),
    ).toBeInTheDocument()
  })

  it('redirects non-school-admin users from school admin classes to login', async () => {
    saveSystemAdminSession()

    renderWithProviders(<AppRoutes />, { route: '/school-admin/classes' })

    expect(
      await screen.findByRole('heading', { name: /đăng nhập/i }),
    ).toBeInTheDocument()
  })

  it('redirects non-school-admin users from school admin class detail to login', async () => {
    saveSystemAdminSession()

    renderWithProviders(<AppRoutes />, {
      route: '/school-admin/classes/class-1',
    })

    expect(
      await screen.findByRole('heading', { name: /chào mừng trở lại/i }),
    ).toBeInTheDocument()
  })

  it('redirects non-school-admin users from school admin class import to login', async () => {
    saveSystemAdminSession()

    renderWithProviders(<AppRoutes />, {
      route: '/school-admin/classes/import',
    })

    expect(
      await screen.findByRole('heading', { name: /chào mừng trở lại/i }),
    ).toBeInTheDocument()
  })

  it('redirects non-school-admin users from school admin class user import to login', async () => {
    saveSystemAdminSession()

    renderWithProviders(<AppRoutes />, {
      route: '/school-admin/classes/class-1/users/import',
    })

    expect(
      await screen.findByRole('heading', { name: /chào mừng trở lại/i }),
    ).toBeInTheDocument()
  })

  it('redirects non-school-admin users from school admin dashboard to login', async () => {
    saveSystemAdminSession()

    renderWithProviders(<AppRoutes />, { route: '/school-admin/dashboard' })

    expect(
      await screen.findByRole('heading', { name: /đăng nhập/i }),
    ).toBeInTheDocument()
  })

  it('renders the system admin dashboard inside the system admin layout', async () => {
    saveSystemAdminSession()
    mockSystemAdminDashboardGraphql()

    renderWithProviders(<AppRoutes />, {
      queryClient: createTestQueryClient(),
      route: '/system-admin/dashboard',
    })

    expect(
      await screen.findByRole('heading', {
        name: /tổng quan hệ thống/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: /quản trị hệ thống/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /mở menu tài khoản/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /^tổng quan$/i }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('renders the registrations placeholder and active navigation item', async () => {
    saveSystemAdminSession()

    renderWithProviders(<AppRoutes />, {
      route: '/system-admin/registrations',
    })

    expect(
      await screen.findByRole('heading', { name: /quản lý đơn đăng ký/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /quản lý đơn đăng ký/i }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('renders the school admin classes route inside the school admin layout', async () => {
    saveSchoolAdminSession()
    mockClassManagementGraphql()

    renderWithProviders(<AppRoutes />, { route: '/school-admin/classes' })

    expect(
      await screen.findByRole('heading', { name: /danh sách lớp học/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: /school admin/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('searchbox', { name: /tìm kiếm/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /mở menu tài khoản/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /quản lý lớp học/i }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('renders the school admin class detail route inside the school admin layout', async () => {
    saveSchoolAdminSession()
    mockClassDetailGraphql()

    renderWithProviders(<AppRoutes />, {
      route: '/school-admin/classes/class-1',
    })

    expect(
      await screen.findByRole('heading', { name: /tiếng anh 6a/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: /school admin/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /mở menu tài khoản/i }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: /school admin/i })).getByRole(
        'link',
        { name: /quản lý lớp học/i },
      ),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('renders the language management route and active navigation item', async () => {
    saveSystemAdminSession()
    mockLanguageManagementGraphql()

    renderWithProviders(<AppRoutes />, {
      route: '/system-admin/languages',
    })

    expect(
      await screen.findByRole('heading', { name: /quản lý ngôn ngữ/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /quản lý ngôn ngữ/i }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('renders the school admin class import route inside the school admin layout', async () => {
    saveSchoolAdminSession()

    renderWithProviders(<AppRoutes />, {
      route: '/school-admin/classes/import',
    })

    expect(
      await screen.findByRole('heading', { name: /tạo lớp số lượng lớn/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: /school admin/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /mở menu tài khoản/i }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: /school admin/i })).getByRole(
        'link',
        { name: /quản lý lớp học/i },
      ),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('renders the school admin class user import route inside the school admin layout', async () => {
    saveSchoolAdminSession()
    mockClassDetailGraphql()

    renderWithProviders(<AppRoutes />, {
      route: '/school-admin/classes/class-1/users/import',
    })

    expect(
      await screen.findByRole('heading', { name: /import người dùng vào lớp/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: /school admin/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /mở menu tài khoản/i }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: /school admin/i })).getByRole(
        'link',
        { name: /quản lý lớp học/i },
      ),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('renders the school admin dashboard inside the school admin layout', async () => {
    saveSchoolAdminSession()
    mockSchoolAdminDashboardGraphql()

    renderWithProviders(<AppRoutes />, {
      queryClient: createTestQueryClient(),
      route: '/school-admin/dashboard',
    })

    expect(
      await screen.findByRole('heading', {
        name: /tổng quan trường/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: /school admin/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /mở menu tài khoản/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /^tổng quan$/i }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('opens and closes the mobile system admin drawer', async () => {
    const user = userEvent.setup()
    saveSystemAdminSession()
    mockSystemAdminDashboardGraphql()

    renderWithProviders(<AppRoutes />, {
      queryClient: createTestQueryClient(),
      route: '/system-admin/dashboard',
    })

    await screen.findByRole('heading', {
      name: /tổng quan hệ thống/i,
    })

    expect(
      screen.queryByRole('dialog', { name: /menu quản trị hệ thống/i }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /^mở menu quản trị hệ thống$/i }),
    )
    const drawer = screen.getByRole('dialog', {
      name: /menu quản trị hệ thống/i,
    })

    expect(
      within(drawer).getByRole('link', { name: /quản lý ngôn ngữ/i }),
    ).toBeInTheDocument()

    await user.click(
      within(drawer).getByRole('button', {
        name: /^đóng menu quản trị hệ thống$/i,
      }),
    )

    expect(
      screen.queryByRole('dialog', { name: /menu quản trị hệ thống/i }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /^mở menu quản trị hệ thống$/i }),
    )

    await user.click(
      screen.getByRole('button', {
        name: /đóng menu quản trị hệ thống bằng lớp phủ/i,
      }),
    )

    expect(
      screen.queryByRole('dialog', { name: /menu quản trị hệ thống/i }),
    ).not.toBeInTheDocument()
  })

  it('closes the mobile drawer after navigating from a nav item', async () => {
    const user = userEvent.setup()
    saveSystemAdminSession()
    mockSystemAdminDashboardGraphql()

    renderWithProviders(<AppRoutes />, {
      queryClient: createTestQueryClient(),
      route: '/system-admin/dashboard',
    })

    await screen.findByRole('heading', {
      name: /tổng quan hệ thống/i,
    })
    await user.click(
      screen.getByRole('button', { name: /^mở menu quản trị hệ thống$/i }),
    )

    const drawer = screen.getByRole('dialog', {
      name: /menu quản trị hệ thống/i,
    })
    // "Quản lý đơn đăng ký" nằm trong nhóm "Trường học"; nhóm chỉ tự mở khi route đang thuộc về nó,
    // nên từ dashboard phải bung nhóm ra trước mới bấm được vào mục con.
    await user.click(within(drawer).getByRole('button', { name: /trường học/i }))
    await user.click(
      within(drawer).getByRole('link', { name: /quản lý đơn đăng ký/i }),
    )

    expect(
      await screen.findByRole('heading', { name: /quản lý đơn đăng ký/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('dialog', { name: /menu quản trị hệ thống/i }),
    ).not.toBeInTheDocument()
  })

  it('logs out from the system admin user menu', async () => {
    const user = userEvent.setup()
    saveSystemAdminSession()
    mockSystemAdminDashboardGraphql()

    renderWithProviders(<AppRoutes />, {
      queryClient: createTestQueryClient(),
      route: '/system-admin/dashboard',
    })

    await screen.findByRole('heading', {
      name: /tổng quan hệ thống/i,
    })
    await user.click(
      screen.getByRole('button', {
        name: /mở menu tài khoản/i,
      }),
    )
    await user.click(screen.getByRole('menuitem', { name: /đăng xuất/i }))

    expect(
      await screen.findByRole('heading', { name: /đăng nhập/i }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(
        localStorage.getItem(AUTH_TOKEN_STORAGE_KEYS.accessToken),
      ).toBeNull()
    })
  })
})
