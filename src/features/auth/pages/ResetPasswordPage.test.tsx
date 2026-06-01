import { act, screen, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { apiClient } from '@/shared/api'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ApiResponse } from '../types'
import { ResetPasswordPage } from './ResetPasswordPage'

jest.mock('@/shared/api', () => ({
  apiClient: {
    patch: jest.fn(),
    post: jest.fn(),
  },
}))

const email = 'admin@vox.edu.vn'
const strongPassword = 'Password1!'

function LocationProbe() {
  const location = useLocation()

  return <div data-testid="location">{location.pathname}</div>
}

function renderResetPasswordPage() {
  return renderWithProviders(
    <>
      <ResetPasswordPage />
      <LocationProbe />
    </>,
    { route: '/reset-password' },
  )
}

async function sendOtp() {
  const user = userEvent.setup()

  jest.mocked(apiClient.post).mockResolvedValue({
    data: {
      data: null,
      message: 'Mã OTP đặt lại mật khẩu đã được gửi',
    },
  } as AxiosResponse<ApiResponse<null>>)

  await user.type(screen.getByLabelText(/^email$/i), email)
  await user.click(screen.getByRole('button', { name: /gửi mã otp/i }))

  await screen.findByLabelText(/mã otp/i)

  return user
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.mocked(apiClient.post).mockReset()
    jest.mocked(apiClient.patch).mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the email step', () => {
    renderResetPasswordPage()

    expect(
      screen.getByRole('heading', { name: /đặt lại mật khẩu/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /gửi mã otp/i }),
    ).toBeInTheDocument()
  })

  it('blocks missing or invalid email without calling the API', async () => {
    const user = userEvent.setup()

    renderResetPasswordPage()

    await user.click(screen.getByRole('button', { name: /gửi mã otp/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /vui lòng nhập email/i,
    )
    expect(apiClient.post).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/^email$/i), 'invalid-email')
    await user.click(screen.getByRole('button', { name: /gửi mã otp/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /email không đúng định dạng/i,
      ),
    )
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('sends OTP and advances to the reset form', async () => {
    renderResetPasswordPage()

    await sendOtp()

    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/auth/reset-password-otp',
      { email },
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      /mã otp đặt lại mật khẩu đã được gửi/i,
    )
    expect(screen.getByLabelText(/mã otp/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^mật khẩu mới$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^xác nhận mật khẩu$/i)).toBeInTheDocument()
  })

  it('blocks weak password and mismatched confirmation', async () => {
    renderResetPasswordPage()

    const user = await sendOtp()

    await user.type(screen.getByLabelText(/mã otp/i), '123456')
    await user.type(screen.getByLabelText(/^mật khẩu mới$/i), 'weak')
    await user.type(screen.getByLabelText(/^xác nhận mật khẩu$/i), 'weak')
    await user.click(screen.getByRole('button', { name: /đặt lại mật khẩu/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /mật khẩu chưa đạt yêu cầu/i,
    )
    expect(apiClient.patch).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText(/^mật khẩu mới$/i))
    await user.clear(screen.getByLabelText(/^xác nhận mật khẩu$/i))
    await user.type(screen.getByLabelText(/^mật khẩu mới$/i), strongPassword)
    await user.type(screen.getByLabelText(/^xác nhận mật khẩu$/i), 'Password2!')
    await user.click(screen.getByRole('button', { name: /đặt lại mật khẩu/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /mật khẩu xác nhận không khớp/i,
    )
    expect(apiClient.patch).not.toHaveBeenCalled()
  })

  it('submits valid reset payload, shows success, and redirects to login', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: null,
        message: 'Mã OTP đặt lại mật khẩu đã được gửi',
      },
    } as AxiosResponse<ApiResponse<null>>)
    jest.mocked(apiClient.patch).mockResolvedValue({
      data: {
        data: null,
        message: 'Mật khẩu đã thay đổi thành công',
      },
    } as AxiosResponse<ApiResponse<null>>)

    renderResetPasswordPage()

    await user.type(screen.getByLabelText(/^email$/i), email)
    await user.click(screen.getByRole('button', { name: /gửi mã otp/i }))
    await user.type(await screen.findByLabelText(/mã otp/i), '123456')
    await user.type(screen.getByLabelText(/^mật khẩu mới$/i), strongPassword)
    await user.type(screen.getByLabelText(/^xác nhận mật khẩu$/i), strongPassword)
    await user.click(screen.getByRole('button', { name: /đặt lại mật khẩu/i }))

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith('/v1/auth/reset-password', {
        email,
        otp: '123456',
        password: strongPassword,
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      /mật khẩu đã thay đổi thành công/i,
    )

    act(() => {
      jest.advanceTimersByTime(1200)
    })

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/login'),
    )
  })

  it('shows API error messages for OTP and reset failures', async () => {
    const user = userEvent.setup()

    jest.mocked(apiClient.post).mockRejectedValueOnce({
      message: 'Email không tồn tại',
      status: 400,
    })

    renderResetPasswordPage()

    await user.type(screen.getByLabelText(/^email$/i), email)
    await user.click(screen.getByRole('button', { name: /gửi mã otp/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /email không tồn tại/i,
    )

    jest.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        data: null,
        message: 'Mã OTP đặt lại mật khẩu đã được gửi',
      },
    } as AxiosResponse<ApiResponse<null>>)
    jest.mocked(apiClient.patch).mockRejectedValueOnce({
      message: 'OTP không hợp lệ',
      status: 400,
    })

    await user.click(screen.getByRole('button', { name: /gửi mã otp/i }))
    await user.type(await screen.findByLabelText(/mã otp/i), '000000')
    await user.type(screen.getByLabelText(/^mật khẩu mới$/i), strongPassword)
    await user.type(screen.getByLabelText(/^xác nhận mật khẩu$/i), strongPassword)
    await user.click(screen.getByRole('button', { name: /đặt lại mật khẩu/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/otp không hợp lệ/i)
  })
})
