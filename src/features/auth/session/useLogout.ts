import { useCallback } from 'react'
import { clearAuthState } from '@/app/store/authSlice'
import { useAppDispatch } from '@/app/store/hooks'
import { unregisterPushDevice } from '@/features/notifications'
import { logoutSession } from '../api/logoutSession'
import { publishAuthBroadcast } from './authChannel'
import { clearAuthTokens } from './authSession'

/**
 * Kết thúc phiên đăng nhập: gỡ thiết bị nhận thông báo, thu hồi phiên phía server, rồi mới xoá
 * token trong máy.
 *
 * Thứ tự trên là BẮT BUỘC. Cả hai bước đầu đều cần header Authorization, mà `clearAuthTokens`
 * chính là thứ lấy nó đi — đảo lại thì cả hai rơi vào 401 và phiên phía server sống tiếp trọn 72
 * giờ theo TTL của cookie refresh_token.
 *
 * Nuốt lỗi của lời gọi mạng là CỐ Ý: hàm này luôn kết thúc bằng việc xoá token trong máy, nên ném
 * lỗi ra ngoài chỉ tạo ra trạng thái tệ nhất — người dùng đã bấm thoát nhưng vẫn bị giữ lại trong
 * phiên, hoặc mất token mà vẫn tưởng còn phiên. Backend cũng được viết theo đúng giao kèo đó:
 * POST /v1/auth/logout luôn trả 200, kể cả khi không có gì để thu hồi.
 *
 * KHÔNG điều hướng — nơi gọi tự quyết. Menu người dùng đá về /login, còn trang thiết lập mật khẩu
 * phải ở nguyên chỗ cũ để người dùng đặt mật khẩu tiếp.
 */
export function useLogout() {
  const dispatch = useAppDispatch()

  return useCallback(async () => {
    await unregisterPushDevice()

    try {
      await logoutSession()
    } catch {
      // Mất mạng, 403 CSRF hay 500 đều không được phép chặn đường đăng xuất — xem chú thích trên.
    }

    clearAuthTokens()
    dispatch(clearAuthState())

    // Sau cùng, và không được bỏ: tab khác đang mở vẫn giữ nguyên giao diện đã đăng nhập cùng một
    // access token còn sống thêm tối đa 15 phút. Trên máy dùng chung, đó là 15 phút người kế tiếp
    // ngồi xuống và đọc được dữ liệu của người vừa bấm đăng xuất.
    publishAuthBroadcast({ type: 'anonymous' })
  }, [dispatch])
}
