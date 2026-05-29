import { act, screen, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { apiClient } from '@/shared/api'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ApiResponse } from '../types'
import { SetupPasswordPage } from './SetupPasswordPage'

jest.mock('@/shared/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

const userId = 'f8635b2c-8770-49a0-9cf7-b6581a1bdc22'
const token = 'GPa444LUenTtdkEd8CsQCtmPd8S3xGrW'
const setupPasswordRoute = `/setup-password?userId=${userId}&token=${token}`
const strongPassword = 'Password1!'

function LocationProbe() {
  const location = useLocation()

  return <div data-testid="location">{location.pathname}</div>
}

function renderSetupPasswordPage(route = setupPasswordRoute) {
  return renderWithProviders(
    <>
      <SetupPasswordPage />
      <LocationProbe />
    </>,
    { route },
  )
}

async function fillPasswordForm(password: string, confirmPassword = password) {
  const user = userEvent.setup()

  await user.type(screen.getByLabelText(/^mật khẩu mới$/i), password)
  await user.type(screen.getByLabelText(/^xác nhận mật khẩu$/i), confirmPassword)

  return user
}

describe('SetupPasswordPage', () => {
  beforeEach(() => {
    jest.mocked(apiClient.post).mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the setup password controls when query params exist', () => {
    renderSetupPasswordPage()

    expect(
      screen.getByRole('heading', { name: /thiết lập mật khẩu/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^mật khẩu mới$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^xác nhận mật khẩu$/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /thiết lập mật khẩu/i }),
    ).toBeEnabled()
  })

  it('blocks submit and shows a validation error for weak passwords', async () => {
    renderSetupPasswordPage()

    const user = await fillPasswordForm('weak')
    await user.click(
      screen.getByRole('button', { name: /thiết lập mật khẩu/i }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /mật khẩu chưa đạt yêu cầu: tối thiểu 8 ký tự/i,
    )
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('blocks submit when confirm password does not match', async () => {
    renderSetupPasswordPage()

    const user = await fillPasswordForm(strongPassword, 'Password2!')
    await user.click(
      screen.getByRole('button', { name: /thiết lập mật khẩu/i }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /mật khẩu xác nhận không khớp/i,
    )
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('shows a missing-link error and does not call the API without token', async () => {
    const user = userEvent.setup()
    renderSetupPasswordPage(`/setup-password?userId=${userId}`)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /liên kết thiết lập mật khẩu không hợp lệ/i,
    )
    expect(
      screen.getByRole('button', { name: /thiết lập mật khẩu/i }),
    ).toBeDisabled()

    await user.click(
      screen.getByRole('button', { name: /thiết lập mật khẩu/i }),
    )

    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('posts valid payload, shows success message, then redirects to login', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: null,
        message: 'Mật khẩu đã được thiết lập thành công',
      },
    } as AxiosResponse<ApiResponse<null>>)

    renderSetupPasswordPage()

    await user.type(screen.getByLabelText(/^mật khẩu mới$/i), strongPassword)
    await user.type(
      screen.getByLabelText(/^xác nhận mật khẩu$/i),
      strongPassword,
    )
    await user.click(
      screen.getByRole('button', { name: /thiết lập mật khẩu/i }),
    )

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith('/v1/auth/setup-password', {
        password: strongPassword,
        token,
        userId,
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      /mật khẩu đã được thiết lập thành công/i,
    )

    act(() => {
      jest.advanceTimersByTime(1200)
    })

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/login'),
    )
  })

  it('shows the API error message for invalid or expired tokens', async () => {
    jest.mocked(apiClient.post).mockRejectedValue({
      message: 'Token không hợp lệ hoặc đã hết hạn',
      status: 400,
    })

    renderSetupPasswordPage()

    const user = await fillPasswordForm(strongPassword)
    await user.click(
      screen.getByRole('button', { name: /thiết lập mật khẩu/i }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /token không hợp lệ hoặc đã hết hạn/i,
    )
  })
})
