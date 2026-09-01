import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { setAuthenticatedUser } from '@/app/store/authSlice'
import { configureAppStore } from '@/app/store/store'
import type { RoleCode } from '@/features/auth/types'
import { renderWithProviders } from '@/test/renderWithProviders'
import { NotFoundPage } from './NotFoundPage'

const UNKNOWN_ROUTE = '/duong-dan-khong-ton-tai'

function createStoreFor(roles: RoleCode[]) {
  const store = configureAppStore()
  store.dispatch(
    setAuthenticatedUser({
      email: 'nguoi-dung@vox.edu.vn',
      exp: Math.floor(Date.now() / 1000) + 3600,
      roles,
      userId: 'user-1',
    }),
  )

  return store
}

function renderNotFoundPage(store?: ReturnType<typeof configureAppStore>) {
  return renderWithProviders(
    <Routes>
      <Route element={<NotFoundPage />} path="*" />
    </Routes>,
    { route: UNKNOWN_ROUTE, store },
  )
}

describe('NotFoundPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('says the page was not found', () => {
    renderNotFoundPage()

    expect(
      screen.getByRole('heading', { level: 1, name: /không tìm thấy trang này/i }),
    ).toBeInTheDocument()
  })

  /**
   * Để người dùng đối chiếu xem mình gõ nhầm chỗ nào, và để có thứ dán vào tin nhắn khi báo một
   * liên kết hỏng cho quản trị viên.
   */
  it('shows the path that was attempted', () => {
    renderNotFoundPage()

    expect(screen.getByText(UNKNOWN_ROUTE)).toBeInTheDocument()
  })

  it('offers the login page to a signed-out visitor', () => {
    renderNotFoundPage()

    expect(screen.getByRole('link', { name: /đăng nhập/i })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('offers their dashboard to a signed-in teacher', () => {
    renderNotFoundPage(createStoreFor(['TEACHER']))

    expect(
      screen.getByRole('link', { name: /về bảng điều khiển/i }),
    ).toHaveAttribute('href', '/teacher/dashboard')
  })

  /**
   * Đăng nhập được nhưng không mang vai trò nào có màn hình thì không có bảng điều khiển để mời
   * họ về — rơi lại lối đăng nhập, thay vì trỏ tới một đường dẫn cũng không tồn tại nốt.
   */
  it('offers the login page when the signed-in role has no dashboard', () => {
    renderNotFoundPage(createStoreFor([]))

    expect(screen.getByRole('link', { name: /đăng nhập/i })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('offers a way back to the previous page', () => {
    renderNotFoundPage()

    expect(
      screen.getAllByRole('button', { name: /quay lại trang trước/i }).length,
    ).toBeGreaterThan(0)
  })
})
