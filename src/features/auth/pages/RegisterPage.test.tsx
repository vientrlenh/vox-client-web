import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { RegisterPage } from './RegisterPage'

describe('RegisterPage', () => {
  it('renders the school registration form controls', () => {
    renderWithProviders(<RegisterPage />)

    expect(
      screen.getByRole('heading', {
        name: /đăng ký tài khoản trường học/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: /họ và tên liên hệ/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: /mã định danh/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: /số điện thoại liên hệ/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: /email liên hệ/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: /tên miền của trường/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: /^tên trường/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: /số học sinh/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: /chức vụ/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /đăng ký tài khoản/i }),
    ).toBeInTheDocument()
  })

  it('links users back to login and renders the shared footer', () => {
    renderWithProviders(<RegisterPage />)

    expect(
      screen
        .getAllByRole('link', { name: /đăng nhập/i })
        .some((link) => link.getAttribute('href') === '/login'),
    ).toBe(true)
    expect(
      screen.getByText(/nền tảng đánh giá bài thi nói tiếng anh/i),
    ).toBeInTheDocument()
  })
})
