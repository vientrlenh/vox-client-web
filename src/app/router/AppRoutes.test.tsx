import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { saveAuthTokens } from '@/features/auth/session/authSession'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AppRoutes } from './AppRoutes'

const mockedGraphqlPost = jest.spyOn(graphqlApiClient, 'post')

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
    refreshToken: 'refresh-token',
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
    refreshToken: 'refresh-token',
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

    renderWithProviders(<AppRoutes />, { route: '/system-admin/dashboard' })

    expect(
      await screen.findByRole('heading', {
        name: /bảng điều khiển system admin/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: /system admin/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('searchbox', { name: /tìm kiếm hệ thống/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('admin@vox.edu.vn')).toBeInTheDocument()
    expect(screen.getByText('SYSTEM_ADMIN')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /tổng quan/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
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
      screen.getByRole('searchbox', { name: /tìm kiếm lớp học/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('school-admin@vox.edu.vn')).toBeInTheDocument()
    expect(screen.getByText('SCHOOL_ADMIN')).toBeInTheDocument()
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
    expect(screen.getByText('school-admin@vox.edu.vn')).toBeInTheDocument()
    expect(screen.getByText('SCHOOL_ADMIN')).toBeInTheDocument()
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
    expect(screen.getByText('school-admin@vox.edu.vn')).toBeInTheDocument()
    expect(screen.getByText('SCHOOL_ADMIN')).toBeInTheDocument()
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
      await screen.findByRole('heading', { name: /import học viên vào lớp/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: /school admin/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('school-admin@vox.edu.vn')).toBeInTheDocument()
    expect(screen.getByText('SCHOOL_ADMIN')).toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: /school admin/i })).getByRole(
        'link',
        { name: /quản lý lớp học/i },
      ),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('renders the school admin dashboard inside the school admin layout', async () => {
    saveSchoolAdminSession()

    renderWithProviders(<AppRoutes />, { route: '/school-admin/dashboard' })

    expect(
      await screen.findByRole('heading', {
        name: /school admin dashboard/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: /school admin/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('school-admin@vox.edu.vn')).toBeInTheDocument()
    expect(screen.getByText('SCHOOL_ADMIN')).toBeInTheDocument()
    expect(screen.getByText('Total classes')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /tổng quan/i }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getByRole('link', { name: /manage classes/i }),
    ).toHaveAttribute('href', '/school-admin/classes')
  })

  it('opens and closes the mobile system admin drawer', async () => {
    const user = userEvent.setup()
    saveSystemAdminSession()

    renderWithProviders(<AppRoutes />, { route: '/system-admin/dashboard' })

    await screen.findByRole('heading', {
      name: /bảng điều khiển system admin/i,
    })

    expect(
      screen.queryByRole('dialog', { name: /menu system admin/i }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /mở menu system admin/i }),
    )
    const drawer = screen.getByRole('dialog', { name: /menu system admin/i })

    expect(
      within(drawer).getByRole('link', { name: /quản lý đơn đăng ký/i }),
    ).toBeInTheDocument()

    await user.click(
      within(drawer).getByRole('button', {
        name: /đóng menu system admin/i,
      }),
    )

    expect(
      screen.queryByRole('dialog', { name: /menu system admin/i }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /mở menu system admin/i }),
    )

    await user.click(
      screen.getByRole('button', {
        name: /đóng menu system admin bằng lớp phủ/i,
      }),
    )

    expect(
      screen.queryByRole('dialog', { name: /menu system admin/i }),
    ).not.toBeInTheDocument()
  })

  it('closes the mobile drawer after navigating from a nav item', async () => {
    const user = userEvent.setup()
    saveSystemAdminSession()

    renderWithProviders(<AppRoutes />, { route: '/system-admin/dashboard' })

    await screen.findByRole('heading', {
      name: /bảng điều khiển system admin/i,
    })
    await user.click(
      screen.getByRole('button', { name: /mở menu system admin/i }),
    )

    const drawer = screen.getByRole('dialog', { name: /menu system admin/i })
    await user.click(
      within(drawer).getByRole('link', { name: /quản lý đơn đăng ký/i }),
    )

    expect(
      await screen.findByRole('heading', { name: /quản lý đơn đăng ký/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('dialog', { name: /menu system admin/i }),
    ).not.toBeInTheDocument()
  })

  it('logs out from the system admin user menu', async () => {
    const user = userEvent.setup()
    saveSystemAdminSession()

    renderWithProviders(<AppRoutes />, { route: '/system-admin/dashboard' })

    await screen.findByRole('heading', {
      name: /bảng điều khiển system admin/i,
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
