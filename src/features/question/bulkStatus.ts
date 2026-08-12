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

/**
 * Bản chụp những gì cần để dự đoán kết quả của một câu đã chọn.
 *
 * Chụp lại tại thời điểm chọn thay vì tra ngược vào danh sách đang hiển thị: lựa chọn được giữ
 * xuyên trang, nên khi người dùng sang trang 2 thì câu đã chọn ở trang 1 không còn nằm trong
 * `data.content` nữa.
 */
export type BulkSelectionCandidate = {
  code: string | null
  /** Cộng tác viên có quyền CAN_EDIT — tương ứng `editorCollaborator` ở backend. */
  editorCollaborator: boolean
  id: string
  owner: boolean
  status: QuestionStatus
}

export type BulkSkipGroup = {
  count: number
  reason: string
}

export type BulkActionPlan = {
  eligible: BulkSelectionCandidate[]
  skipped: Array<{ candidate: BulkSelectionCandidate; reason: string }>
  /** Gom theo lý do để nói "3 câu vì X" thay vì liệt kê từng mã câu hỏi. */
  skippedGroups: BulkSkipGroup[]
}

function isAdminRole(role: QuestionActorRole) {
  return role === 'SYSTEM_ADMIN' || role === 'SCHOOL_ADMIN'
}

function invalidStatusReason(
  candidate: BulkSelectionCandidate,
  allowed: QuestionStatus[],
) {
  return `đang ở trạng thái "${getQuestionStatusDisplay(candidate.status).label}", thao tác này chỉ áp dụng cho câu ở trạng thái ${formatStatusList(allowed)}`
}

/**
 * Lý do câu này sẽ bị bỏ qua, hoặc `null` nếu thao tác chạy được.
 *
 * Phản chiếu `QuestionStatusTransition.rejectionFor` ở backend — kể cả thứ tự kiểm tra, để lý do
 * hiện trước khi bấm trùng với lý do backend trả về sau khi bấm. Backend vẫn là nơi quyết định
 * cuối cùng: ở đây cố tình chỉ dự đoán những điều kiện client biết chắc (trạng thái, tác giả,
 * quyền cộng tác), không đoán quyền quản trị theo từng ngân hàng câu hỏi.
 */
function skipReasonFor(
  action: QuestionWorkflowAction,
  role: QuestionActorRole,
  candidate: BulkSelectionCandidate,
): string | null {
  const admin = isAdminRole(role)
  const { editorCollaborator, owner, status } = candidate

  switch (action) {
    case 'SUBMIT': {
      if (!owner && !editorCollaborator && !admin) {
        return 'bạn không phải người tạo hoặc người cộng tác có quyền sửa câu hỏi này'
      }

      const allowed = getBulkEligibleStatuses('SUBMIT', role)
      return allowed.includes(status) ? null : invalidStatusReason(candidate, allowed)
    }
    case 'APPROVE': {
      if (!admin) {
        // Tác giả không tự duyệt bài mình được, kể cả khi có quyền sửa — đây là lý do bị bỏ qua
        // phổ biến nhất trên màn hình duyệt hàng loạt.
        if (owner) {
          return 'do bạn tạo nên cần người khác duyệt'
        }
        if (!editorCollaborator) {
          return 'bạn không có quyền duyệt câu hỏi này'
        }
      }

      const allowed = getBulkEligibleStatuses('APPROVE', role)
      return allowed.includes(status) ? null : invalidStatusReason(candidate, allowed)
    }
    case 'PUBLISH': {
      // Xuất bản lại câu đã lưu trữ là thao tác của quản trị viên.
      if (status === 'ARCHIVED') {
        return admin ? null : 'đang lưu trữ, chỉ quản trị viên mới xuất bản lại được'
      }

      const allowed = getBulkEligibleStatuses('PUBLISH', role)
      if (!allowed.includes(status)) {
        return invalidStatusReason(candidate, allowed)
      }

      return owner || editorCollaborator || admin
        ? null
        : 'bạn không có quyền xuất bản câu hỏi này'
    }
    default:
      return null
  }
}

/**
 * Chia lựa chọn thành phần chạy được và phần sẽ bị bỏ qua, kèm lý do cụ thể.
 *
 * Mục đích là thay câu "thao tác chỉ áp dụng cho những câu bạn có quyền" bằng con số thật:
 * người dùng cần biết bấm xong sẽ ra sao *trước* khi bấm, chứ không phải đọc bảng lỗi sau đó.
 */
export function planBulkAction(
  action: QuestionWorkflowAction,
  role: QuestionActorRole,
  candidates: BulkSelectionCandidate[],
): BulkActionPlan {
  const eligible: BulkSelectionCandidate[] = []
  const skipped: BulkActionPlan['skipped'] = []
  const groups = new Map<string, BulkSkipGroup>()

  candidates.forEach((candidate) => {
    const reason = skipReasonFor(action, role, candidate)

    if (!reason) {
      eligible.push(candidate)
      return
    }

    skipped.push({ candidate, reason })

    const group = groups.get(reason)
    if (group) {
      group.count += 1
      return
    }

    groups.set(reason, { count: 1, reason })
  })

  return { eligible, skipped, skippedGroups: [...groups.values()] }
}

/** "3 câu đang ở trạng thái ...; 1 câu do bạn tạo nên cần người khác duyệt." */
export function formatSkipGroups(groups: BulkSkipGroup[]) {
  return groups.map((group) => `${group.count} câu ${group.reason}`).join('; ')
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
