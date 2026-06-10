import { screen, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/shared/api'
import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ApiResponse, LoginResponse } from '../types'
import { LoginPage } from './LoginPage'

jest.mock('@/shared/api', () => ({
  AUTH_TOKEN_STORAGE_KEYS: {
    accessToken: 'vox.accessToken',
    refreshToken: 'vox.refreshToken',
  },
  apiClient: {
    post: jest.fn(),
  },
}))

function createJwt(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

function createLoginResponse(roles: string[]) {
  return {
    accessToken: createJwt({
      email: 'admin@vox.edu.vn',
      exp: Math.floor(Date.now() / 1000) + 3600,
      roles,
      userId: 'user-1',
    }),
    refreshToken: 'refresh-token',
    roles,
  }
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.mocked(apiClient.post).mockReset()
  })

  it('renders the login form controls', () => {
    renderWithProviders(<LoginPage />)

    expect(
      screen.getByRole('heading', { name: /đăng nhập/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/email hoặc số điện thoại/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^mật khẩu$/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^đăng nhập$/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /đăng nhập bằng google/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /quên mật khẩu/i }),
    ).toHaveAttribute('href', '/reset-password')
  })

  it('stores tokens and authenticates a SYSTEM_ADMIN login', async () => {
    const user = userEvent.setup()
    const responseData = createLoginResponse(['SYSTEM_ADMIN'])
    const mockedPost = jest.mocked(apiClient.post)
    mockedPost.mockResolvedValue({
      data: {
        data: responseData,
        message: 'Đăng nhập thành công',
      },
    } as AxiosResponse<ApiResponse<LoginResponse>>)

    const { store } = renderWithProviders(<LoginPage />)

    await user.type(
      screen.getByLabelText(/email hoặc số điện thoại/i),
      'admin@vox.edu.vn',
    )
    await user.type(screen.getByLabelText(/^mật khẩu$/i), 'secret')
    await user.click(screen.getByRole('button', { name: /^đăng nhập$/i }))

    await waitFor(() =>
      expect(store.getState().auth.status).toBe('authenticated'),
    )

    expect(mockedPost).toHaveBeenCalledWith('/v1/auth/login', {
      device: {
        deviceId: expect.any(String),
        deviceName: expect.any(String),
        platform: 'WEB',
      },
      login: 'admin@vox.edu.vn',
      password: 'secret',
    })
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEYS.accessToken)).toBe(
      responseData.accessToken,
    )
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEYS.refreshToken)).toBe(
      responseData.refreshToken,
    )
  })

  it('stores tokens and authenticates a SCHOOL_ADMIN login', async () => {
    const user = userEvent.setup()
    const responseData = createLoginResponse(['SCHOOL_ADMIN'])
    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: responseData,
        message: 'ÄÄƒng nháº­p thÃ nh cÃ´ng',
      },
    } as AxiosResponse<ApiResponse<LoginResponse>>)

    const { store } = renderWithProviders(<LoginPage />)

    await user.type(
      screen.getByLabelText(/email hoặc số điện thoại/i),
      'school-admin@vox.edu.vn',
    )
    await user.type(screen.getByLabelText(/^mật khẩu$/i), 'secret')
    await user.click(screen.getByRole('button', { name: /^đăng nhập$/i }))

    await waitFor(() =>
      expect(store.getState().auth.status).toBe('authenticated'),
    )

    expect(store.getState().auth.user?.roles).toContain('SCHOOL_ADMIN')
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEYS.accessToken)).toBe(
      responseData.accessToken,
    )
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEYS.refreshToken)).toBe(
      responseData.refreshToken,
    )
  })

  it('shows an error and does not call the API when required fields are missing', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /^đăng nhập$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /vui lòng nhập email hoặc số điện thoại và mật khẩu/i,
    )
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('clears tokens and blocks unsupported roles', async () => {
    const user = userEvent.setup()
    const responseData = createLoginResponse(['TEACHER'])
    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: responseData,
        message: 'Đăng nhập thành công',
      },
    } as AxiosResponse<ApiResponse<LoginResponse>>)

    renderWithProviders(<LoginPage />)

    await user.type(
      screen.getByLabelText(/email hoặc số điện thoại/i),
      'teacher@vox.edu.vn',
    )
    await user.type(screen.getByLabelText(/^mật khẩu$/i), 'secret')
    await user.click(screen.getByRole('button', { name: /^đăng nhập$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /vai trò hiện chưa được hỗ trợ/i,
    )
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEYS.accessToken)).toBeNull()
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEYS.refreshToken)).toBeNull()
  })

  it('shows the API error message when credentials are rejected', async () => {
    const user = userEvent.setup()
    jest.mocked(apiClient.post).mockRejectedValue({
      message: 'Sai thông tin đăng nhập',
      status: 401,
    })

    renderWithProviders(<LoginPage />)

    await user.type(
      screen.getByLabelText(/email hoặc số điện thoại/i),
      'wrong@vox.edu.vn',
    )
    await user.type(screen.getByLabelText(/^mật khẩu$/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /^đăng nhập$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /sai thông tin đăng nhập/i,
    )
  })
})
