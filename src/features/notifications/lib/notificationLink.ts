import type { RoleCode } from '@/features/auth/types'
import type { AppNotification, NotificationPayload } from '../types'

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
 * <p>Phải lọc theo vai trò: cùng một `assignmentId` chỉ có trang dành cho giáo viên, và
 * một học sinh bấm vào sẽ rơi vào route bị `RequireRole` chặn.
 *
 * <p>`candidateResultId` cố tình không sinh link chi tiết: các route kết quả hiện có
 * (`/student/exams/:sessionId/result`) nhận `sessionId`, không phải id kết quả, nên
 * không có cách nào dựng URL đúng từ payload. Học sinh được đưa về danh sách bài thi cho
 * tới khi backend trả thêm `sessionId` trong payload.
 */
export function resolveNotificationLink(
  notification: AppNotification,
  roles: RoleCode[],
): string | null {
  const payload = parseNotificationPayload(notification.payload)

  if (!payload) {
    return null
  }

  if (payload.appealId && roles.includes('STUDENT')) {
    return `/student/appeals/${payload.appealId}`
  }

  if (payload.assignmentId && roles.includes('TEACHER')) {
    return `/teacher/grading/${payload.assignmentId}`
  }

  if (payload.candidateResultId && roles.includes('STUDENT')) {
    return '/student/exams'
  }

  return null
}
