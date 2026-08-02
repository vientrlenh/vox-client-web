import type { ExamMemberRole, ResultDecisionMethod } from '@/features/examCore/types'

export type { ExamMemberRole } from '@/features/examCore/types'

export type CreateExamRequest = {
  assessmentPolicyId?: string | null
  blueprintId?: string | null
  closeAt?: string | null
  code: string
  description?: string | null
  languageId: string
  maxAttempt?: number | null
  name: string
  openAt?: string | null
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

export type ExamStreamType = 'CAMERA' | 'SCREEN'

export type ExamStreamTypePermission = 'ALL' | 'ANY'

/**
 * Cấu hình giám sát của kỳ thi, mô hình hoá thành MỘT giá trị thay vì hai trường rời.
 *
 * <p>Server (CreateExamUseCase.resolveStreamConfig) chỉ nhận đúng 5 tổ hợp: permission phải vắng
 * khi chỉ chọn một loại stream, và bắt buộc khi chọn cả hai. Cặp checkbox + dropdown riêng diễn đạt
 * được 12 tổ hợp, trong đó 5 tổ hợp trả về 400 và 3 tổ hợp khác nhau lại cho cùng một kết quả -
 * nghĩa là phải viết lại luật của server ở tầng client, thứ chắc chắn lệch khi server đổi.
 *
 * <p>Với một union 5 nhánh thì tổ hợp sai đơn giản là không biểu đạt được.
 */
export type ExamStreamSetup =
  | 'BOTH_REQUIRED'
  | 'BOTH_STUDENT_CHOICE'
  | 'CAMERA_ONLY'
  | 'NO_MONITORING'
  | 'SCREEN_ONLY'

export const EXAM_STREAM_SETUP_PAYLOAD: Record<
  ExamStreamSetup,
  Pick<CreateExamRequest, 'requiredStreamTypes' | 'streamTypePermission'>
> = {
  BOTH_REQUIRED: { requiredStreamTypes: ['CAMERA', 'SCREEN'], streamTypePermission: 'ALL' },
  BOTH_STUDENT_CHOICE: { requiredStreamTypes: ['CAMERA', 'SCREEN'], streamTypePermission: 'ANY' },
  CAMERA_ONLY: { requiredStreamTypes: ['CAMERA'], streamTypePermission: null },
  NO_MONITORING: { requiredStreamTypes: null, streamTypePermission: null },
  SCREEN_ONLY: { requiredStreamTypes: ['SCREEN'], streamTypePermission: null },
}

export type ExamStreamSetupOption = {
  hint: string
  label: string
  tone?: 'warning'
  value: ExamStreamSetup
}

/**
 * Thứ tự hiển thị: an toàn nhất trước, phá hoại nhất sau cùng.
 *
 * <p>Nhãn nói theo **hệ quả** chứ không dùng tên enum: "ANY"/"ALL" không cho giáo viên biết điều gì
 * sẽ xảy ra với học viên, và đó mới là thứ họ đang quyết định.
 */
export const EXAM_STREAM_SETUPS: ExamStreamSetupOption[] = [
  {
    hint: 'Học viên phải bật đồng thời camera và chia sẻ màn hình. Mức giám sát đầy đủ nhất.',
    label: 'Bắt buộc cả camera và màn hình',
    value: 'BOTH_REQUIRED',
  },
  {
    hint: 'Chỉ ghi camera. Không có bằng chứng về những gì diễn ra trên màn hình học viên.',
    label: 'Chỉ camera',
    value: 'CAMERA_ONLY',
  },
  {
    hint: 'Chỉ ghi màn hình. Không xác thực được ai đang ngồi trước máy.',
    label: 'Chỉ màn hình',
    value: 'SCREEN_ONLY',
  },
  {
    // Ứng dụng thi trên máy học viên hiện luôn bật cả hai (ExamSessionBootstrapService không gửi
    // loại ưu tiên), nên lựa chọn này tạm thời cho ra kết quả giống "bắt buộc cả hai". Nói thẳng
    // trong UI thay vì để nó hứa một điều hệ thống chưa làm được.
    hint: 'Học viên tự chọn camera hoặc màn hình. Chưa có hiệu lực: ứng dụng thi hiện vẫn bật cả hai.',
    label: 'Cho học viên tự chọn',
    value: 'BOTH_STUDENT_CHOICE',
  },
  {
    hint: 'Tắt hoàn toàn giám sát cho kỳ thi này. Giám thị sẽ không mở được phòng giám sát và không có bản ghi nào.',
    label: 'Không giám sát',
    tone: 'warning',
    value: 'NO_MONITORING',
  },
]

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
