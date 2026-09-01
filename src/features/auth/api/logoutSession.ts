import { type ApiResponse, apiClient } from '@/shared/api'
import { getClientDevice } from '../session/authSession'
import type { LogoutRequest } from '../types'

/**
 * Thu hồi phiên phía server.
 *
 * `deviceId` phải là đúng id đã dùng lúc đăng nhập: backend dọn MỌI phiên còn sống của cặp
 * (userId, deviceId), mà mỗi lần đăng nhập lại tạo một phiên mới, nên một máy có thể đang mang
 * nhiều phiên cùng lúc. Lệch id thì phần dư tiếp tục sống hết 72 giờ mà không ai thấy.
 *
 * Cookie refresh_token đi kèm tự động nhờ `withCredentials` của apiClient, và chính nó — không
 * phải access token — là bằng chứng backend dùng để thu hồi khi access token đã hết hạn. Vì đọc
 * cookie nên endpoint này được bảo vệ CSRF; apiClient đã bật sẵn `withXSRFToken`.
 */
export async function logoutSession() {
  const payload: LogoutRequest = {
    deviceId: getClientDevice().deviceId,
  }

  await apiClient.post<ApiResponse<null>>('/v1/auth/logout', payload)
}
