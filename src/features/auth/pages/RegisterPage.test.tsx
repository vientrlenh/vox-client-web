import { screen, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/shared/api'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ApiResponse } from '../types'
import { RegisterPage } from './RegisterPage'

jest.mock('@/shared/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

async function fillValidRegisterForm() {
  const user = userEvent.setup()

  await user.type(
    screen.getByRole('textbox', { name: /họ và tên liên hệ/i }),
    'Nguyen Van A',
  )
  await user.type(
    screen.getByRole('textbox', { name: /mã định danh/i }),
    '123456789',
  )
  await user.type(
    screen.getByRole('textbox', { name: /số điện thoại liên hệ/i }),
    '0987654321',
  )
  await user.type(
    screen.getByRole('textbox', { name: /email liên hệ/i }),
    'admin@school.edu.vn',
  )
  await user.type(
    screen.getByRole('textbox', { name: /ngày sinh/i }),
    '2000-05-24',
  )
  await user.type(
    screen.getByRole('textbox', { name: /địa chỉ liên hệ/i }),
    '123 Nguyen Trai',
  )
  await user.type(
    screen.getByRole('textbox', { name: /tên miền của trường/i }),
    'school.edu.vn',
  )
  await user.type(
    screen.getByRole('textbox', { name: /^tên trường/i }),
    'VOX School',
  )
  await user.type(
    screen.getByRole('textbox', { name: /địa chỉ trường/i }),
    '456 Le Loi',
  )
  await user.type(
    screen.getByRole('textbox', { name: /mã bưu chính/i }),
    '700000',
  )
  await user.type(
    screen.getByRole('spinbutton', { name: /số học sinh/i }),
    '500',
  )
  await user.selectOptions(
    screen.getByRole('combobox', { name: /chức vụ/i }),
    'Hiệu trưởng',
  )

  return user
}

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.mocked(apiClient.post).mockReset()
  })

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
      screen.getByRole('spinbutton', { name: /số học sinh/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: /chức vụ/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /đăng ký tài khoản/i }),
    ).toBeInTheDocument()
  })

  it('posts a valid registration payload and shows the success message', async () => {
    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: null,
        message: 'Đơn đăng ký đã được gửi thành công',
      },
    } as AxiosResponse<ApiResponse<null>>)

    renderWithProviders(<RegisterPage />)

    const user = await fillValidRegisterForm()
    await user.click(screen.getByRole('button', { name: /đăng ký tài khoản/i }))

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith('/v1/auth/register', {
        contactAddress: '123 Nguyen Trai',
        contactEmail: 'admin@school.edu.vn',
        contactFullName: 'Nguyen Van A',
        contactPhone: '0987654321',
        dateOfBirth: '2000-05-24',
        identityNumber: '123456789',
        position: 'Hiệu trưởng',
        postalCode: '700000',
        schoolAddress: '456 Le Loi',
        schoolDomain: 'school.edu.vn',
        schoolName: 'VOX School',
        studentCount: 500,
      }),
    )
    expect(
      await screen.findByText(/đơn đăng ký đã được gửi thành công/i),
    ).toBeInTheDocument()
  })

  it('shows the first validation error returned by the API', async () => {
    jest.mocked(apiClient.post).mockRejectedValue({
      details: {
        errors: {
          contactEmail: 'Email không hợp lệ',
        },
      },
      message: 'BAD_REQUEST',
      status: 400,
    })

    renderWithProviders(<RegisterPage />)

    const user = await fillValidRegisterForm()
    await user.click(screen.getByRole('button', { name: /đăng ký tài khoản/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /email không hợp lệ/i,
    )
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
