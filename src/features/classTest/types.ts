import type { StatusTone } from '@/shared/ui/StatusBadge'
import type { ExamDto, ExamStatus, ResultDecisionMethod } from '@/features/examCore/types'

/** Loại stream giám sát BE chấp nhận. Gửi cả hai thì bắt buộc kèm `streamTypePermission`. */
export type ExamStreamType = 'CAMERA' | 'SCREEN'

/** ALL = phải bật đủ cả hai luồng; ANY = học sinh chọn một trong hai. */
export type ExamStreamTypePermission = 'ALL' | 'ANY'

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

export type CreateClassTestRequest = {
  assessmentPolicyId?: string | null
  closeAt?: string | null
  /** Giá trị enum của BE (`STUDENT_DEVICE` | `LAB`), không phải alias `DEVICE` dùng trong UI. */
  deliveryMode?: 'LAB' | 'STUDENT_DEVICE' | null
  description?: string | null
  existingBlueprintId?: string | null
  existingBlueprintVersionId?: string | null
  maxAttempt?: number | null
  name: string
  openAt?: string | null
  /** Bỏ trống = không giám sát bằng stream; khi đó bài cũng không mở được màn hình theo dõi. */
  requiredStreamTypes?: ExamStreamType[] | null
  requiresOtp?: boolean | null
  resultDecisionMethod?: ResultDecisionMethod | null
  /** Có thể bỏ trống lúc tạo rồi chọn sau ở tab Xếp lịch, nhưng phải có trước khi lên lịch. */
  schoolRoomId?: string | null
  sections?: ClassTestSectionInput[] | null
  schoolClassId: string
  /** Chỉ có tác dụng khi `requiredStreamTypes` gồm cả CAMERA lẫn SCREEN. */
  streamTypePermission?: ExamStreamTypePermission | null
}

export type UpdateClassTestQuestionsRequest = {
  sections: ClassTestSectionInput[]
}

export type ChangeClassTestBlueprintRequest = {
  blueprintId?: string | null
  blueprintVersionId?: string | null
}

export type CreateClassTestResponse = {
  candidateCount: number
  exam: ExamDto
  paperId: string
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
      return { tone: 'success', label: 'Đã trả điểm' }
    case 'CANCELLED':
      return { tone: 'danger', label: 'Đã hủy' }
    default:
      return { tone: 'neutral', label: String(status ?? '-') }
  }
}
