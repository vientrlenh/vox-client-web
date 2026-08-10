/**
 * Tên `AppNotification` thay vì `Notification` là có chủ ý: `Notification` là một global
 * của trình duyệt (Web Notifications API). Khi lớp push realtime được thêm vào sau này,
 * cùng một file sẽ vừa dùng kiểu này vừa gọi `Notification.requestPermission()`, và một
 * cái tên trùng global ở đó là nguồn nhầm lẫn không cần thiết.
 */
export type AppNotification = {
  body: string | null
  /** ISO-8601 UTC — backend trả về `Instant.toString()`. */
  createdAt: string | null
  eventId: string | null
  eventType: string | null
  id: string
  /** Chuỗi JSON đã stringify, xem `parseNotificationPayload`. */
  payload: string | null
  readAt: string | null
  title: string | null
  userId: string
}

export type NotificationCursorPage = {
  content: AppNotification[]
  hasNext: boolean
  nextCursor: string | null
}

/**
 * Các khoá id mà backend nhét vào `payload`, xem `NotificationPushedEventConsumer.data(...)`.
 * Mỗi thông báo chỉ mang đúng một trong ba khoá này, kèm `eventType`.
 */
export type NotificationPayload = {
  appealId?: string
  assignmentId?: string
  candidateResultId?: string
  eventType?: string
}
