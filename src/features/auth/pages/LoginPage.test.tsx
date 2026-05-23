import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('renders the login form controls', () => {
    renderWithProviders(<LoginPage />)

    expect(
      screen.getByRole('heading', { name: /đăng nhập/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^mật khẩu$/i)).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: /ghi nhớ đăng nhập/i }),
    ).toBeChecked()
    expect(
      screen.getByRole('button', { name: /^đăng nhập$/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /đăng nhập bằng google/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/kết nối với chúng tôi/i)).toBeInTheDocument()
  })

  it('shows success for the mock credentials', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/^email$/i), 'demo@vox.edu.vn')
    await user.type(screen.getByLabelText(/^mật khẩu$/i), 'Vox@123456')
    await user.click(screen.getByRole('button', { name: /^đăng nhập$/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      /đăng nhập mock thành công/i,
    )
  })

  it('shows an error for invalid credentials', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/^email$/i), 'wrong@vox.edu.vn')
    await user.type(screen.getByLabelText(/^mật khẩu$/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /^đăng nhập$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /tài khoản mock không đúng/i,
    )
  })
})
