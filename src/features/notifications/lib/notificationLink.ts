import type { RoleCode } from '@/features/auth/types'
import type { AppNotification, NotificationPayload } from '../types'
import { resolveTargetLink } from './notificationTarget'

export function parseNotificationPayload(
  payload: string | null,
): NotificationPayload | null {
  if (!payload) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(payload)
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as NotificationPayload)
      : null
  } catch {
    // Payload hỏng không được phép làm vỡ cả danh sách thông báo — thông báo vẫn đọc
    // được, chỉ là không bấm sang trang chi tiết được.
    return null
  }
}

/**
 * Suy ra đường dẫn để mở khi bấm vào một thông báo.
 *
 * <p>Toàn bộ phần quyết định nằm ở `resolveTargetLink`: hàm này chỉ bóc `payload` từ chuỗi
 * JSON ra. Trước đây nó tự dò xem payload có khoá nào (`appealId` -> trang phúc khảo,
 * `assignmentId` -> trang chấm) — cách đó không phân biệt được hai event dùng chung một
 * khoá nhưng gửi cho hai vai trò khác nhau, và mỗi client lại đoán một kiểu.
 */
export function resolveNotificationLink(
  notification: AppNotification,
  roles: RoleCode[],
): string | null {
  return resolveTargetLink(parseNotificationPayload(notification.payload), roles)
}
