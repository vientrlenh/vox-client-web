import { useEffect, useRef } from 'react'
import { Navigate, useParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useMyNotificationQuery } from '../api/useMyNotificationsQuery'
import { useMarkNotificationAsReadMutation } from '../api/useNotificationMutations'
import { resolveNotificationLink } from '../lib/notificationLink'

/**
 * Nơi lui về khi không dựng được đường dẫn nào.
 *
 * <p>Web KHÔNG có trang danh sách thông báo (khác app Flutter): chuông chỉ mở một bảng nổi
 * nằm trong bốn layout theo vai trò, không có URL riêng để trỏ tới. Trang chủ là đích duy
 * nhất mọi vai trò đều vào được, và cũng là chỗ route lạ vẫn rơi về từ trước tới nay.
 *
 * <p>Nhánh này hiếm khi chạy: thiếu id thì từng `toPath` đã tự lui về trang danh sách của
 * đúng khu vực (`/student/exams`, `/teacher/grading`...) chứ không rơi tới đây.
 */
const FALLBACK_PATH = '/'

/**
 * Route `/n/:notificationId` — chỗ hạ cánh của mọi cú bấm vào thông báo đẩy.
 *
 * <p>Backend gắn đúng đường dẫn này vào `webpush.fcmOptions.link` thay vì URL màn hình
 * thật (xem `FcmNotificationService.webpushLink`). Lý do: cột `notifications.payload` sống
 * mãi, nên một URL màn hình nhúng vào đó sẽ nói dối ngay hôm bảng route đổi. `/n/{id}` là
 * một lớp gián tiếp ổn định — bảng route ở lại trong client, nơi nó thuộc về.
 *
 * <p>Đặt sau `RequireAuth` là phần thiết yếu chứ không phải tiện tay: người bấm vào thông
 * báo sau nhiều ngày thường đã hết phiên, và guard sẽ đưa họ qua đăng nhập rồi quay lại
 * đúng URL này. Service worker vì thế không cần biết gì về đăng nhập.
 */
export function NotificationRedirectPage() {
  const { notificationId } = useParams<{ notificationId: string }>()
  const roles = useAppSelector((state) => state.auth.user?.roles)
  const notificationQuery = useMyNotificationQuery(notificationId)
  const markAsRead = useMarkNotificationAsReadMutation()

  const notification = notificationQuery.data ?? null

  /**
   * Mutation chạy đúng một lần cho mỗi thông báo. `markAsRead.mutate` đổi định danh sau mỗi
   * lần render, nên để nó trong mảng phụ thuộc sẽ đánh dấu đã đọc lặp vô hạn; ref là thứ
   * duy nhất ở đây thực sự nói lên "đã bắn cho id này chưa".
   */
  const markedIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!notification || notification.readAt) {
      return
    }
    if (markedIdRef.current === notification.id) {
      return
    }

    markedIdRef.current = notification.id
    markAsRead.mutate(notification.id)
  }, [markAsRead, notification])

  if (!notificationId) {
    return <Navigate replace to={FALLBACK_PATH} />
  }

  if (notificationQuery.isPending) {
    return (
      <p className="px-4 py-10 text-center text-sm font-medium text-slate-500">
        Đang mở thông báo...
      </p>
    )
  }

  /*
   * Thông báo đã bị xoá, id sai, hoặc là của tài khoản khác. Cả ba đều lui về chứ không
   * hiện lỗi: người dùng vừa bấm vào một thông báo có thật trên máy họ, một trang lỗi ở đây
   * chỉ nói rằng ứng dụng hỏng.
   */
  if (notificationQuery.isError || !notification) {
    return <Navigate replace to={FALLBACK_PATH} />
  }

  const link = resolveNotificationLink(notification, roles ?? [])

  // `replace` ở mọi nhánh: /n/{id} là trạm trung chuyển, để nó lại trong history nghĩa là
  // nút Back đưa người dùng quay về đây rồi lập tức bị đẩy đi tiếp.
  return <Navigate replace to={link ?? FALLBACK_PATH} />
}
