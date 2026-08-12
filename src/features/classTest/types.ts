import type { StatusTone } from '@/shared/ui/StatusBadge'
import type {
  ExamDto,
  ExamStatus,
  ExamStreamType,
  ExamStreamTypePermission,
  ResultDecisionMethod,
} from '@/features/examCore/types'

// Bài kiểm tra trên lớp đi qua đúng validator stream của server như kỳ thi tập trung
// (ExamStreamConfigResolver), nên dùng chung một mô hình ở `examCore` thay vì tự khai lại.
export {
  EXAM_STREAM_SETUP_PAYLOAD,
  EXAM_STREAM_SETUPS,
  type ExamStreamSetup,
  type ExamStreamType,
  type ExamStreamTypePermission,
} from '@/features/examCore/types'

export type ClassTestSectionQuestionInput = {
  questionId: string
  weight: number
}

export type ClassTestSectionInput = {
  instruction?: string | null
  questions: ClassTestSectionQuestionInput[]
  title: string
  weight?: number | null
}

/**
 * Chỉ là "vỏ" bài kiểm tra: soạn đề (câu hỏi trực tiếp / blueprint / sao chép) là bước riêng ở
 * trang chi tiết, qua `POST /v1/exams/:examId/papers` — giống hệt kỳ thi tập trung.
 */
export type CreateClassTestRequest = {
  assessmentPolicyId?: string | null
  closeAt?: string | null
  description?: string | null
  maxAttempt?: number | null
  name: string
  openAt?: string | null
  /**
   * Bắt buộc (không optional) dù server chấp nhận null, y hệt `CreateExamRequest`: cấu hình giám
   * sát không sửa được sau khi tạo, và bỏ trống nghĩa là học sinh KHÔNG vào thi được nếu ứng dụng
   * thi vẫn xin stream token.
   *
   * <p>Đừng gán trực tiếp: dùng {@link EXAM_STREAM_SETUP_PAYLOAD}.
   */
  requiredStreamTypes: ExamStreamType[] | null
  requiresOtp?: boolean | null
  resultDecisionMethod?: ResultDecisionMethod | null
  /** Có thể bỏ trống lúc tạo rồi chọn sau ở tab Xếp lịch, nhưng phải có trước khi lên lịch. */
  schoolRoomId?: string | null
  schoolClassId: string
  /** Chỉ có tác dụng khi `requiredStreamTypes` gồm cả CAMERA lẫn SCREEN. */
  streamTypePermission: ExamStreamTypePermission | null
}

export type UpdateClassTestQuestionsRequest = {
  /** Mã đề được thay toàn bộ nội dung. Bỏ trống chỉ hợp lệ khi bài có đúng một mã đề. */
  paperId?: string | null
  sections: ClassTestSectionInput[]
}

export type ChangeClassTestBlueprintRequest = {
  blueprintId?: string | null
  blueprintVersionId?: string | null
}

export type CreateClassTestResponse = {
  candidateCount: number
  exam: ExamDto
}

export function getClassTestStatusDisplay(status?: ExamStatus | string | null): { tone: StatusTone; label: string } {
  switch (status) {
    case 'DRAFT':
      return { tone: 'warning', label: 'Đang soạn' }
    case 'SCHEDULED':
      return { tone: 'info', label: 'Đã lên lịch' }
    case 'IN_PROGRESS':
      return { tone: 'violet', label: 'Đang mở' }
    case 'CLOSED':
      return { tone: 'neutral', label: 'Đã đóng' }
    case 'RESULTS_PUBLISHED':
      return { tone: 'success', label: 'Đã chốt kết quả' }
    case 'CANCELLED':
      return { tone: 'danger', label: 'Đã hủy' }
    default:
      return { tone: 'neutral', label: String(status ?? '-') }
  }
}
