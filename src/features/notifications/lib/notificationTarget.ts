import type { RoleCode } from '@/features/auth/types'
import type { NotificationPayload, NotificationTarget } from '../types'

/**
 * Bảng tra DUY NHẤT từ `target` của server sang route của web.
 *
 * <p>Server chốt "mở cái gì" (`target`) và gửi kèm các id cần thiết; phía này chỉ dịch
 * sang "mở đường dẫn nào". Trước đây mỗi client tự đoán màn hình bằng cách dò xem payload
 * có khoá nào -- cách đó không phân biệt được hai event cùng mang `assignmentId` nhưng gửi
 * cho hai vai trò khác nhau, nên thông báo của school admin không bao giờ bấm được.
 *
 * <p>`role` là phần bắt buộc chứ không phải trang trí: `RequireRole` XOÁ phiên đăng nhập
 * khi vai trò không khớp (xem `app/router/RequireRole.tsx`), nên dẫn nhầm người vào route
 * của vai trò khác không chỉ là ngõ cụt -- nó đá họ ra màn hình đăng nhập.
 */
type RoleRoute = {
  /** Vai trò mà route này thuộc về. Thiếu nó, người dùng bị đăng xuất khi bấm nhầm. */
  role: RoleCode
  /**
   * Dựng đường dẫn từ các id trong payload.
   *
   * <p>Trả về đường dẫn danh sách khi thiếu id: event cũ còn trong Kafka lúc nâng cấp
   * không mang các khoá mới, và mở đúng khu vực vẫn hơn hẳn không mở được gì.
   */
  toPath: (payload: NotificationPayload) => string
}

/**
 * Danh sách ứng viên theo vai trò, xét theo THỨ TỰ: route đầu tiên mà người dùng có vai trò
 * sẽ được chọn.
 *
 * <p>Hầu hết target chỉ có một ứng viên. Nhiều ứng viên dành cho thông báo gửi tới nhiều vai
 * trò cùng lúc mà mỗi vai trò có màn hình riêng -- `EXAM_HUMAN_GRADING_REQUIRED` báo cho cả
 * chủ tịch hội đồng (thường là giáo viên) lẫn school admin, và hai bên vào hai trang khác
 * nhau. Đích ngữ nghĩa vẫn là một, nên nó là MỘT target chứ không phải hai; chuyện đường dẫn
 * khác nhau theo vai trò là việc của bảng route, không phải của server.
 */
type TargetRoute = RoleRoute[]

const ROUTE_BY_TARGET: Record<NotificationTarget, TargetRoute> = {
  ADMIN_GRADING_ASSIGNMENT: [
    {
      role: 'SCHOOL_ADMIN',
      toPath: ({ examId, examKind }) =>
        examKind === 'CLASS_TEST' && examId
          ? `/school-admin/class-tests/${examId}/grading`
          : '/school-admin/grading',
    },
  ],
  EXAM_APPEAL_DETAIL: [
    {
      role: 'STUDENT',
      toPath: ({ appealId }) =>
        appealId ? `/student/appeals/${appealId}` : '/student/appeals',
    },
  ],
  /**
   * Bài thi đóng lại mà còn bài "Chờ soát điểm AI".
   *
   * <p>School admin đứng trước giáo viên vì với người mang cả hai vai trò, trang quản trị là
   * góc nhìn bao trùm cả kỳ thi. Người chỉ có một vai trò thì không có gì để chọn -- và đó là
   * đa số: bài trên lớp chỉ báo cho giáo viên chủ bài.
   */
  EXAM_HUMAN_GRADING_REQUIRED: [
    {
      role: 'SCHOOL_ADMIN',
      toPath: ({ examId, examKind }) =>
        examKind === 'CLASS_TEST' && examId
          ? `/school-admin/class-tests/${examId}/grading`
          : `/school-admin/exam-results?examId=${examId}`,
    },
    {
      role: 'TEACHER',
      toPath: ({ examId, examKind }) =>
        examKind === 'CLASS_TEST' && examId
          ? `/teacher/class-tests/${examId}/grading`
          : `/teacher/exam-results?examId=${examId}`,
    },
  ],
  EXAM_RESULT_DETAIL: [
    {
      role: 'STUDENT',
      toPath: ({ examKind, sessionId }) => {
        const base = examKind === 'CLASS_TEST' ? '/student/class-tests' : '/student/exams'
        return sessionId ? `${base}/${sessionId}/result` : base
      },
    },
  ],
  SCHOOL_BILLING_OVERVIEW: [
    { role: 'SCHOOL_ADMIN', toPath: () => '/school-admin/balance' },
  ],
  SCHOOL_BLUEPRINT_DETAIL: [
    {
      role: 'SCHOOL_ADMIN',
      toPath: ({ blueprintId, versionId }) => {
        if (!blueprintId) {
          return '/school-admin/blueprints'
        }
        return versionId
          ? `/school-admin/blueprints/${blueprintId}/versions/${versionId}`
          : `/school-admin/blueprints/${blueprintId}`
      },
    },
  ],
  /**
   * Chưa có màn hình tra hóa đơn theo số, nên dừng ở danh sách đơn hàng.
   *
   * <p>Nhánh này chỉ mới bắt đầu chạy được: trước đó không chỗ nào trong backend phát
   * `InvoicePaid` (OrderSettlementService tạo Invoice nhưng không ghi outbox), nên chưa từng
   * có thông báo hóa đơn nào tồn tại. Xem `OrderSettlementService.publishInvoicePaid`.
   */
  SCHOOL_INVOICE_DETAIL: [
    { role: 'SCHOOL_ADMIN', toPath: () => '/school-admin/orders' },
  ],
  SCHOOL_SUBSCRIPTION_DETAIL: [
    { role: 'SCHOOL_ADMIN', toPath: () => '/school-admin/subscription/mine' },
  ],
  SYSTEM_SCHOOL_ATTENTION: [
    { role: 'SYSTEM_ADMIN', toPath: () => '/system-admin/schools/attention' },
  ],
  TEACHER_GRADING_TASK: [
    {
      role: 'TEACHER',
      toPath: ({ assignmentId, examId, examKind }) => {
        if (!assignmentId) {
          return '/teacher/grading'
        }
        return examKind === 'CLASS_TEST' && examId
          ? `/teacher/class-tests/${examId}/grading/${assignmentId}`
          : `/teacher/grading/${assignmentId}`
      },
    },
  ],
}

/**
 * Đường dẫn để mở khi bấm vào một thông báo, hoặc null khi không mở được.
 *
 * <p>Null có đúng ba nguyên nhân, và cả ba đều phải dẫn tới "không cho bấm" chứ không phải
 * một cú điều hướng hỏng: payload không đọc được, `target` server gửi mà bản web này chưa
 * biết (backend đi trước một nhịp), và người dùng không có vai trò của route nào.
 */
export function resolveTargetLink(
  payload: NotificationPayload | null,
  roles: RoleCode[],
): string | null {
  const target = payload?.target

  if (!target) {
    return null
  }

  // Object.hasOwn chứ không phải truthy-check trên kết quả tra bảng: `target` tới từ mạng,
  // và một giá trị lạ như "toString" vẫn trả về hàm nếu tra thẳng theo prototype chain.
  if (!Object.hasOwn(ROUTE_BY_TARGET, target)) {
    return null
  }

  const route = ROUTE_BY_TARGET[target].find((candidate) =>
    roles.includes(candidate.role),
  )

  return route ? route.toPath(payload) : null
}
