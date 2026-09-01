import { Suspense } from 'react'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { setAuthenticatedUser } from '@/app/store/authSlice'
import { configureAppStore } from '@/app/store/store'
import { renderWithProviders } from '@/test/renderWithProviders'
import { HomeRoute } from './HomeRoute'

function renderHomeRoute(store?: ReturnType<typeof configureAppStore>) {
  return renderWithProviders(
    <Suspense fallback={<div>đang tải</div>}>
      <Routes>
        <Route element={<HomeRoute />} path="/" />
        <Route
          element={<div>bảng điều khiển giáo viên</div>}
          path="/teacher/dashboard"
        />
      </Routes>
    </Suspense>,
    { store },
  )
}

describe('HomeRoute', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the public landing page to a signed-out visitor', async () => {
    renderHomeRoute()

    expect(
      await screen.findByRole('heading', {
        name: /đánh giá kỹ năng nói thông minh hơn/i,
      }),
    ).toBeInTheDocument()
  })

  /**
   * Người đã đăng nhập nhìn thấy trang giới thiệu kèm nút "Đăng nhập" thì tưởng phiên đã mất --
   * và từ khi phiên được khôi phục bằng cookie ở mỗi lần mở trang, mở lại bookmark trang chủ là
   * chuyện hằng ngày.
   */
  it('sends a signed-in visitor to their dashboard', async () => {
    const store = configureAppStore()
    store.dispatch(
      setAuthenticatedUser({
        email: 'teacher@vox.edu.vn',
        exp: Math.floor(Date.now() / 1000) + 3600,
        roles: ['TEACHER'],
        userId: 'user-1',
      }),
    )

    renderHomeRoute(store)

    expect(
      await screen.findByText('bảng điều khiển giáo viên'),
    ).toBeInTheDocument()
  })
})
