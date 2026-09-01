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
 * Màn hình mà server muốn client mở. Danh sách phải khớp enum `NotificationTarget` bên
 * backend — thêm giá trị mới ở đó mà quên ở đây thì `resolveTargetLink` trả về null và
 * thông báo mất khả năng bấm, chứ không dẫn đi lung tung.
 */
export type NotificationTarget =
  | 'ADMIN_GRADING_ASSIGNMENT'
  | 'EXAM_APPEAL_DETAIL'
  | 'EXAM_HUMAN_GRADING_REQUIRED'
  | 'EXAM_RESULT_DETAIL'
  | 'SCHOOL_BILLING_OVERVIEW'
  | 'SCHOOL_BLUEPRINT_DETAIL'
  | 'SCHOOL_INVOICE_DETAIL'
  | 'SCHOOL_SUBSCRIPTION_DETAIL'
  | 'SYSTEM_SCHOOL_ATTENTION'
  | 'TEACHER_GRADING_TASK'

/** Bài tập trung và bài kiểm tra lớp có màn hình riêng, xem `notificationTarget.ts`. */
export type NotificationExamKind = 'CENTRALIZED' | 'CLASS_TEST'

/**
 * Nội dung `payload`, xem `NotificationPushedEventConsumer.data(...)`.
 *
 * Mọi khoá đều optional vì hai lý do khác nhau: các dòng notification ghi trước khi backend
 * bổ sung khoá điều hướng sẽ mãi mãi thiếu chúng (cột này không được backfill), và mỗi
 * `target` chỉ dùng một nhóm khoá riêng.
 */
export type NotificationPayload = {
  appealId?: string
  assignmentId?: string
  blueprintId?: string
  candidateResultId?: string
  eventType?: string
  examId?: string
  examKind?: NotificationExamKind
  /** Chỉ app Flutter dùng: màn hình kết quả bên đó nhận tên kỳ thi để dựng tiêu đề. */
  examName?: string
  invoiceNumber?: string
  schoolId?: string
  sessionId?: string
  target?: NotificationTarget
  versionId?: string
}
