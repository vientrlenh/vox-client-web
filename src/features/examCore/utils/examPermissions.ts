import type { ExamMemberRole, ExamPaperStatus, UpdateExamPaperStatusRequest } from '../types'

export type ExamPaperAction = UpdateExamPaperStatusRequest['action']

/**
 * Ai làm được gì trên trang chi tiết kỳ thi tập trung.
 *
 * <p>Trước đây hai wrapper `TeacherExamDetailPage` / `SchoolAdminExamDetailPage` truyền xuống 5 cờ
 * tĩnh trái ngược nhau, nên quản trị trường bị tắt hẳn phần mã đề còn chủ tịch hội đồng bị tắt hẳn
 * phần thông tin/trạng thái — không vai nào chạy hết được quy trình 5 bước mà trang này vẽ ra. Giờ
 * cả hai đều chạy trọn, và luật nằm ở đúng một hàm thay vì rải trong JSX.
 *
 * <p>`examMyRole` trả `null` cho quản trị trường (họ không phải `exam_member`), nên phải ghép vai
 * trò toàn cục với vai trò trong kỳ thi mới ra được câu trả lời.
 */
export type ExamAuthority = {
  /** Gắn / đổi khung đề. Khớp `canAttachBlueprint`: quản trị trường, AUTHOR, hoặc CHAIR. */
  canAttachBlueprint: boolean
  /** Xoá kỳ thi — thao tác phá huỷ, chủ tịch hội đồng không có. */
  canDeleteExam: boolean
  /** Chốt phiên bản khung đề. Khớp `canApproveBlueprintVersion`: quản trị trường hoặc CHAIR. */
  canFinalizeBlueprintVersion: boolean
  /** Bổ nhiệm / thu hồi chủ tịch hội đồng — chỉ quản trị trường. */
  canManageChairMembers: boolean
  /** Sửa thông tin kỳ thi. */
  canManageInfo: boolean
  /** Thêm / đổi / xoá thành viên hội đồng (vai CHAIR còn phải qua `canManageChairMembers`). */
  canManageMembers: boolean
  /** Tạo, soạn nội dung, xoá mã đề. */
  canManagePapers: boolean
  /** Xếp ca thi, phòng, giám thị, thí sinh. */
  canManageSchedule: boolean
  /** Lên lịch / bắt đầu / đóng / công bố kết quả. */
  canManageStatus: boolean
  /** Mở khoá ngân hàng câu hỏi sau kỳ thi — thao tác của hội đồng, không phải của quản trị trường. */
  canReleaseSecurePool: boolean
}

const NO_AUTHORITY: ExamAuthority = {
  canAttachBlueprint: false,
  canDeleteExam: false,
  canFinalizeBlueprintVersion: false,
  canManageChairMembers: false,
  canManageInfo: false,
  canManageMembers: false,
  canManagePapers: false,
  canManageSchedule: false,
  canManageStatus: false,
  canReleaseSecurePool: false,
}

export function resolveExamAuthority(input: {
  isSchoolAdmin: boolean
  myRole: ExamMemberRole | null | undefined
}): ExamAuthority {
  const { isSchoolAdmin, myRole } = input
  const isChair = myRole === 'CHAIR'
  const isAuthor = myRole === 'AUTHOR'

  if (!isSchoolAdmin && !myRole) {
    return NO_AUTHORITY
  }

  return {
    canAttachBlueprint: isSchoolAdmin || isChair || isAuthor,
    canDeleteExam: isSchoolAdmin,
    canFinalizeBlueprintVersion: isSchoolAdmin || isChair,
    canManageChairMembers: isSchoolAdmin,
    canManageInfo: isSchoolAdmin || isChair,
    canManageMembers: isSchoolAdmin || isChair,
    canManagePapers: isSchoolAdmin || isChair || isAuthor,
    canManageSchedule: isSchoolAdmin || isChair,
    canManageStatus: isSchoolAdmin || isChair,
    canReleaseSecurePool: isChair,
  }
}

/**
 * Những nút trạng thái được phép hiện trên một mã đề — bản sao đúng luật của
 * `UpdateExamPaperStatusUseCase`. Giữ ở một hàm thuần để tab "Tạo mã đề" và trang soạn đề không
 * bao giờ lệch nhau.
 *
 * <p>Hai đường đi, chọn theo ai soạn ra mã đề:
 * <ul>
 *   <li>Mã đề do <b>người khác</b> soạn: DRAFT → IN_REVIEW → APPROVED → LOCKED, người soạn không tự
 *       duyệt được bài mình. `APPROVED` vì thế luôn có nghĩa "đã qua mắt người thứ hai".</li>
 *   <li>Mã đề do <b>chính người quyết định</b> (chủ tịch hội đồng / quản trị trường) soạn: đi tắt
 *       một bước DRAFT → LOCKED.</li>
 * </ul>
 */
export function resolvePaperActions(input: {
  authority: ExamAuthority
  isOwnPaper: boolean
  myRole: ExamMemberRole | null | undefined
  paperStatus: ExamPaperStatus
}): ExamPaperAction[] {
  const { authority, isOwnPaper, myRole, paperStatus } = input
  if (!authority.canManagePapers) {
    return []
  }

  // Người quyết định = quản trị trường hoặc chủ tịch. Không suy ra được từ `myRole` một mình vì
  // quản trị trường có `myRole === null`; `canManageStatus` là cờ duy nhất phân biệt họ với AUTHOR.
  const canDecide = authority.canManageStatus
  const canReview = canDecide || myRole === 'REVIEWER'
  const canAuthor = authority.canManagePapers

  switch (paperStatus) {
    case 'DRAFT':
      // Đi tắt và nộp duyệt loại trừ nhau: hiện cả hai nút trên cùng một mã đề chỉ làm người dùng
      // phân vân giữa hai đường dẫn tới cùng một đích.
      if (canDecide && isOwnPaper) {
        return ['LOCK']
      }
      return canAuthor ? ['SUBMIT'] : []
    case 'IN_REVIEW':
      return canReview && !isOwnPaper ? ['APPROVE', 'REQUEST_REVISION'] : []
    case 'APPROVED':
      return canDecide && !isOwnPaper ? ['LOCK'] : []
    case 'LOCKED':
      return canDecide ? ['REOPEN'] : []
    default:
      return []
  }
}

/**
 * Nội dung mã đề còn sửa được không. Trạng thái kỳ thi và trạng thái mã đề đã chặn ở
 * `UpdateExamPaperItemUseCase`; ở đây chỉ nhân bản để nút không hiện ra rồi ăn lỗi.
 */
export function canEditPaperContent(input: {
  authority: ExamAuthority
  examKind: 'CENTRALIZED' | 'CLASS_TEST' | undefined
  examStatus: string | undefined
  paperStatus: ExamPaperStatus
}): boolean {
  const { authority, examKind, examStatus, paperStatus } = input
  if (examStatus === 'IN_PROGRESS') {
    return false
  }
  // Bài trên lớp không có hội đồng đề — chỉ giáo viên chủ bài vào được trang này và họ soạn mọi mã đề
  // — nên `examMyRole` ở đó không phải tín hiệu đáng tin để gác. Và LOCKED ở bài trên lớp là một bước
  // DRAFT ↔ LOCKED mở lại tự do, không mang nghĩa "chốt, không sửa nữa" như kỳ thi tập trung.
  if (examKind === 'CLASS_TEST') {
    return true
  }
  return authority.canManagePapers && paperStatus !== 'LOCKED'
}
