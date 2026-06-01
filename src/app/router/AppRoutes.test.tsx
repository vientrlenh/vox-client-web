import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { saveAuthTokens } from '@/features/auth/session/authSession'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AppRoutes } from './AppRoutes'

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

describe('AppRoutes', () => {
  beforeEach(() => {
    localStorage.clear()
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
