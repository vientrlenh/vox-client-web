import { lazy } from 'react'
import { Navigate } from 'react-router'
import { useDashboardPath } from '@/features/auth/session/useDashboardPath'

const HomePage = lazy(() =>
  import('@/features/home').then((module) => ({ default: module.HomePage })),
)

/**
 * Trang chủ giữ nguyên vai trò trang giới thiệu công khai cho khách, nhưng người đang đăng nhập
 * thì đi thẳng vào bảng điều khiển của họ.
 *
 * Lý do phân đôi thay vì chọn hẳn một phía: trang giới thiệu vẫn phải mở được không cần tài
 * khoản (cùng lý do với /privacy-policy), trong khi người đã đăng nhập mà nhìn thấy nó kèm nút
 * "Đăng nhập" thì tưởng phiên đã mất -- nhất là từ khi phiên được khôi phục lại bằng cookie ở
 * mỗi lần mở trang, tức là mở lại bookmark trang chủ là chuyện thường ngày.
 */
export function HomeRoute() {
  const dashboardPath = useDashboardPath()

  if (dashboardPath) {
    return <Navigate replace to={dashboardPath} />
  }

  return <HomePage />
}
