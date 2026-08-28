/**
 * Hợp đồng chung của hai endpoint đổi trạng thái hàng loạt:
 * `PATCH /v1/question-banks/bulk/status` và `PATCH /v1/question-topics/bulk/status`.
 *
 * Ngân hàng và chủ đề câu hỏi dùng chung bộ trạng thái DRAFT/PUBLISHED/ARCHIVED và chung một
 * QuestionScopeStatusTransition ở backend, nên phía client cũng chỉ cần một kiểu.
 */

export type BulkScopeStatusAction = 'ARCHIVE' | 'PUBLISH'

export type BulkScopeStatusRequest = {
  action: BulkScopeStatusAction
  ids: string[]
}

/** Khớp với BulkUpdateQuestionScopeStatusFailure ở backend. */
export type BulkScopeStatusFailure = {
  /** `null` khi backend không tìm thấy mục. */
  code: string | null
  /** Tên enum trạng thái hiện tại, `null` khi không tìm thấy. */
  currentStatus: string | null
  id: string
  reason: string
  /** Dùng để gom nhóm các mục hỏng cùng một lý do. */
  reasonCode: string
}

/**
 * "Thành công một phần": HTTP 200 KHÔNG có nghĩa là mọi mục đều đổi được — mục bị từ chối nằm
 * trong `failed` kèm lý do, phải hiện cho người dùng thấy.
 */
export type BulkScopeStatusApiResult<TUpdated> = {
  failed: BulkScopeStatusFailure[]
  updated: TUpdated[]
}
