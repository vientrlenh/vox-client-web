import type { QuestionWorkflowAction, QuestionActorRole } from './permissions'
import { getQuestionStatusDisplay } from './types'
import type { BulkUpdateQuestionStatusFailure, QuestionStatus } from './types'

/**
 * Trạng thái mà backend chấp nhận cho từng thao tác (xem QuestionStatusTransition ở backend).
 * Dùng để cảnh báo TRƯỚC khi gọi API — người dùng hay chọn cả trang rồi mới biết phần lớn bị bỏ qua.
 * Đây chỉ là bộ lọc theo trạng thái: quyền vẫn do backend quyết định.
 */
const BULK_ACTION_STATUSES: Record<QuestionWorkflowAction, QuestionStatus[]> = {
  APPROVE: ['SUBMITTED_FOR_REVIEW'],
  ARCHIVE: ['PUBLISHED'],
  PUBLISH: ['APPROVED', 'ARCHIVED'],
  REJECT: ['SUBMITTED_FOR_REVIEW'],
  REQUEST_REVISION: ['SUBMITTED_FOR_REVIEW'],
  SUBMIT: ['DRAFT', 'REVISION_REQUESTED'],
}

export function getBulkEligibleStatuses(
  action: QuestionWorkflowAction,
  role: QuestionActorRole,
): QuestionStatus[] {
  // Xuất bản lại một câu đã lưu trữ là thao tác của quản trị viên, giáo viên không làm được.
  if (action === 'PUBLISH' && role === 'TEACHER') {
    return ['APPROVED']
  }

  return BULK_ACTION_STATUSES[action]
}

export function formatStatusList(statuses: QuestionStatus[]) {
  const labels = statuses.map((status) => `"${getQuestionStatusDisplay(status).label}"`)

  if (labels.length <= 1) {
    return labels[0] ?? ''
  }

  return `${labels.slice(0, -1).join(', ')} hoặc ${labels[labels.length - 1]}`
}

export type BulkFailureGroup = {
  /** Gợi ý cách xử lý, suy ra từ reasonCode. */
  hint: string | null
  items: BulkUpdateQuestionStatusFailure[]
  key: string
  reason: string
}

export type BulkStatusResult = {
  /** Động từ của thao tác, vd "duyệt". */
  actionVerb: string
  failed: BulkUpdateQuestionStatusFailure[]
  totalCount: number
  updatedCount: number
}

/**
 * Gợi ý "làm gì tiếp theo" cho từng mã lý do. Bản thân `reason` đã nói câu hỏi sai ở đâu, phần này
 * nói người dùng phải làm gì để sửa — đó mới là thứ họ cần khi 10 câu cùng bị bỏ qua.
 */
const HINT_BY_REASON_CODE: Record<string, string> = {
  ADMIN_ONLY: 'Nhờ quản trị viên của ngân hàng câu hỏi thực hiện thao tác này.',
  ALREADY_LOCKED: 'Câu hỏi đang bị khóa, hãy mở khóa trước khi thao tác.',
  INVALID_STATUS:
    'Lọc danh sách theo đúng trạng thái ở bộ lọc phía trên rồi chọn lại, hoặc dùng nút "Chỉ chọn câu hợp lệ".',
  NOTE_REQUIRED:
    'Thao tác này bắt buộc nhập lý do — hãy thực hiện trong trang chi tiết từng câu hỏi.',
  NOT_LOCKED: 'Câu hỏi chưa bị khóa nên không cần mở khóa.',
  NO_PERMISSION: 'Bạn không có quyền trên những câu hỏi này, hãy liên hệ quản trị viên.',
  QUESTION_BANK_NOT_FOUND: 'Ngân hàng câu hỏi có thể vừa bị xóa — hãy tải lại danh sách.',
  QUESTION_NOT_FOUND: 'Câu hỏi có thể vừa bị xóa — hãy tải lại danh sách.',
  SELF_REVIEW: 'Nhờ quản trị viên hoặc người cộng tác khác duyệt giúp những câu bạn tự tạo.',
}

/**
 * Gom các câu bị bỏ qua theo lý do, giữ nguyên thứ tự backend trả về.
 *
 * Duyệt hàng loạt thường trượt hàng chục câu vì cùng một lý do; liệt kê từng câu một biến thông báo
 * thành một bức tường chữ. Gom nhóm cho phép nói "10 câu đang ở trạng thái Đã duyệt" một lần rồi
 * mới liệt kê mã câu hỏi.
 */
export function groupBulkFailures(
  failed: BulkUpdateQuestionStatusFailure[],
): BulkFailureGroup[] {
  const groups = new Map<string, BulkFailureGroup>()

  failed.forEach((failure) => {
    // Cùng reasonCode nhưng khác text (vd trạng thái hiện tại khác nhau) vẫn là hai nhóm khác nhau,
    // vì text mới là thứ người dùng đọc.
    const key = `${failure.reasonCode}::${failure.reason}`
    const group = groups.get(key)

    if (group) {
      group.items.push(failure)
      return
    }

    groups.set(key, {
      hint: HINT_BY_REASON_CODE[failure.reasonCode] ?? null,
      items: [failure],
      key,
      reason: failure.reason,
    })
  })

  return [...groups.values()]
}
