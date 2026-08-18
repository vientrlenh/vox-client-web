import type {
  ExamMemberRole,
  ExamStreamType,
  ExamStreamTypePermission,
  ResultDecisionMethod,
} from '@/features/examCore/types'

export type { ExamMemberRole } from '@/features/examCore/types'

// Cấu hình giám sát dùng chung với bài kiểm tra trên lớp nên sống ở `examCore`. Re-export để
// call-site cũ của feature này không phải đổi import.
export {
  EXAM_STREAM_SETUP_PAYLOAD,
  EXAM_STREAM_SETUPS,
  type ExamStreamSetup,
  type ExamStreamSetupOption,
  type ExamStreamType,
  type ExamStreamTypePermission,
} from '@/features/examCore/types'

export type CreateExamRequest = {
  /**
   * Ngưỡng tin cậy AI theo PHẦN TRĂM (0-100). Bỏ trống = không đặt, hệ thống dùng bộ luật ngưỡng
   * mặc định như trước.
   *
   * <p>Đặt rồi thì bài nào AI chấm với độ tin cậy thấp hơn ngưỡng sẽ chuyển sang chờ giáo viên
   * duyệt, và các luật mặc định bị bỏ qua -- nhà trường tự quyết mức chấp nhận được.
   */
  aiConfidenceThresholdPercent?: number | null
  assessmentPolicyId?: string | null
  blueprintId?: string | null
  /**
   * Bắt buộc: khung mở/đóng là ràng buộc ngoài của mọi ca thi và phải nằm trong hạn gói dịch vụ
   * của trường -- server từ chối nếu thiếu (`SubscriptionPeriodGuardService`).
   */
  closeAt: string
  code: string
  description?: string | null
  languageId: string
  maxAttempt?: number | null
  name: string
  openAt: string
  requiresOtp?: boolean | null
  resultDecisionMethod?: ResultDecisionMethod | null
  /**
   * Bắt buộc (không optional) dù server chấp nhận null: cấu hình giám sát **không sửa được sau khi
   * tạo** - UpdateExamRequest không có hai trường này - và bỏ trống nghĩa là tắt giám sát vĩnh viễn
   * cho kỳ thi đó. Bắt mọi chỗ tạo kỳ thi phải nêu rõ ý định, thay vì để một lần quên biến thành
   * một kỳ thi không có bằng chứng nào.
   *
   * <p>Đừng gán trực tiếp: dùng {@link EXAM_STREAM_SETUP_PAYLOAD} - server chỉ nhận đúng 5 tổ hợp.
   */
  requiredStreamTypes: ExamStreamType[] | null
  streamTypePermission: ExamStreamTypePermission | null
}

export type CreateExamMemberRequest = {
  role: ExamMemberRole
  userId: string
}

export type CreateBlueprintInlineRequest = {
  code: string
  description?: string | null
  languageId: string
  name: string
  schoolGradeLevelId?: string | null
}

export type AttachExamBlueprintRequest = {
  blueprintId?: string | null
  blueprintVersionId?: string | null
  newBlueprint?: CreateBlueprintInlineRequest | null
}

// Đã chuyển xuống `examCore` để các màn dùng chung (kể cả picker) khỏi phải import ngược
// lên feature `exam`. Re-export để call-site cũ không phải đổi.
export { getExamStatusDisplay, getMemberRoleDisplay } from '@/features/examCore/types'
