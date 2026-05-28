import { screen } from '@testing-library/react'
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

  it('redirects unauthenticated users from the system admin dashboard to login', async () => {
    renderWithProviders(<AppRoutes />, { route: '/system-admin/dashboard' })

    expect(
      await screen.findByRole('heading', { name: /đăng nhập/i }),
    ).toBeInTheDocument()
  })

  it('renders the system admin dashboard for SYSTEM_ADMIN users', async () => {
    saveAuthTokens({
      accessToken: createJwt({
        email: 'admin@vox.edu.vn',
        exp: Math.floor(Date.now() / 1000) + 3600,
        roles: ['SYSTEM_ADMIN'],
        userId: 'user-1',
      }),
      refreshToken: 'refresh-token',
    })

    renderWithProviders(<AppRoutes />, { route: '/system-admin/dashboard' })

    expect(
      await screen.findByRole('heading', {
        name: /bảng điều khiển system admin/i,
      }),
    ).toBeInTheDocument()
  })
})
