import type { StatusTone } from '@/shared/ui/StatusBadge'

export type ExamKind = 'CENTRALIZED' | 'CLASS_TEST'

export type ExamStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'CLOSED'
  | 'RESULTS_PUBLISHED'
  | 'CANCELLED'

export type ExamMemberRole = 'CHAIR' | 'AUTHOR' | 'REVIEWER'

export type ExamPaperStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'LOCKED'

export type ExamBlueprintVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type ExamBlueprintSlotType = 'FIXED' | 'SELECTION'

/** `questions` = soạn câu hỏi trực tiếp, chỉ bài kiểm tra trên lớp chưa gắn blueprint mới dùng được. */
export type CreateExamPaperSource = 'blueprint' | 'copy' | 'questions'

export type ExamCandidateStatus = 'ASSIGNED' | 'ATTENDED' | 'ABSENT' | 'COMPLETED' | 'EXEMPTED' | 'CANCELLED'

export type ExamScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'MOVED' | 'CANCELLED'

export type ExamDeliveryMode = 'DEVICE' | 'LAB'

export type ResultDecisionMethod = 'HIGHEST' | 'LATEST' | 'AVERAGE' | 'FIRST' | 'LOWEST'

export const RESULT_DECISION_METHODS: ResultDecisionMethod[] = ['HIGHEST', 'LATEST', 'AVERAGE', 'FIRST', 'LOWEST']
export type AssessmentPolicyStrictness = 'LENIENT' | 'STANDARD' | 'STRICT'


export type ExamStreamType = 'CAMERA' | 'SCREEN'

/** Dạng BE lưu trên exam: hai loại đồng thời gộp lại thành một nhánh riêng. */
export type ExamRequiredStreamType = 'CAMERA' | 'CAMERA_AND_SCREEN' | 'SCREEN'

export type ExamStreamTypePermission = 'ALL' | 'ANY'

/**
 * Cấu hình giám sát của kỳ thi, mô hình hoá thành MỘT giá trị thay vì hai trường rời.
 *
 * <p>Server (ExamStreamConfigResolver) chỉ nhận đúng 5 tổ hợp: permission phải vắng khi chỉ chọn
 * một loại stream, và bắt buộc khi chọn cả hai. Cặp checkbox + dropdown riêng diễn đạt được 12 tổ
 * hợp, trong đó 5 tổ hợp trả về 400 và 3 tổ hợp khác nhau lại cho cùng một kết quả - nên UI phải
 * chọn 1 trong 5, không phải tự ghép.
 *
 * <p>Với một union 5 nhánh thì tổ hợp sai đơn giản là không biểu đạt được.
 *
 * <p>Dùng chung cho cả kỳ thi tập trung lẫn bài kiểm tra trên lớp: hai luồng tạo đi qua đúng một
 * validator ở server, nên không có lý do gì để hai form diễn đạt nó theo hai cách khác nhau.
 */
export type ExamStreamSetup =
  | 'BOTH_REQUIRED'
  | 'BOTH_STUDENT_CHOICE'
  | 'CAMERA_ONLY'
  | 'NO_MONITORING'
  | 'SCREEN_ONLY'

export type ExamStreamSetupPayload = {
  requiredStreamTypes: ExamStreamType[] | null
  streamTypePermission: ExamStreamTypePermission | null
}

export const EXAM_STREAM_SETUP_PAYLOAD: Record<ExamStreamSetup, ExamStreamSetupPayload> = {
  BOTH_REQUIRED: { requiredStreamTypes: ['CAMERA', 'SCREEN'], streamTypePermission: 'ALL' },
  BOTH_STUDENT_CHOICE: { requiredStreamTypes: ['CAMERA', 'SCREEN'], streamTypePermission: 'ANY' },
  CAMERA_ONLY: { requiredStreamTypes: ['CAMERA'], streamTypePermission: null },
  NO_MONITORING: { requiredStreamTypes: null, streamTypePermission: null },
  SCREEN_ONLY: { requiredStreamTypes: ['SCREEN'], streamTypePermission: null },
}

/**
 * Chiều ngược của EXAM_STREAM_SETUP_PAYLOAD: đọc cấu hình đang lưu trên exam về lại union 5 nhánh
 * để form sửa hiển thị đúng mức giám sát hiện tại.
 *
 * <p>Để ngay cạnh bảng map ghi, vì hai chiều phải luôn khớp nhau.
 */
export function toExamStreamSetup(
  requiredStreamType?: ExamRequiredStreamType | null,
  streamTypePermission?: ExamStreamTypePermission | null,
): ExamStreamSetup {
  if (!requiredStreamType) {
    return 'NO_MONITORING'
  }
  if (requiredStreamType === 'CAMERA') {
    return 'CAMERA_ONLY'
  }
  if (requiredStreamType === 'SCREEN') {
    return 'SCREEN_ONLY'
  }
  // Dữ liệu cũ có thể thiếu permission dù yêu cầu cả hai loại; coi như mức chặt nhất.
  return streamTypePermission === 'ANY' ? 'BOTH_STUDENT_CHOICE' : 'BOTH_REQUIRED'
}

/**
 * Payload stream cho PUT (sửa), khác EXAM_STREAM_SETUP_PAYLOAD ở đúng một điểm: NO_MONITORING gửi
 * mảng RỖNG chứ không phải null — trên API sửa, null nghĩa là "giữ nguyên", nên gửi null sẽ khiến
 * "Không giám sát" im lặng không có tác dụng.
 */
export function toUpdateStreamPayload(setup: ExamStreamSetup): {
  requiredStreamTypes: ExamStreamType[]
  streamTypePermission: ExamStreamTypePermission | null
} {
  const payload = EXAM_STREAM_SETUP_PAYLOAD[setup]
  return {
    requiredStreamTypes: payload.requiredStreamTypes ?? [],
    streamTypePermission: payload.streamTypePermission,
  }
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
    // Học viên chọn ở màn kiểm tra thiết bị, và lựa chọn bị CHỐT xuống phiên thi ngay lần phát
    // stream token đầu tiên -- không đổi được giữa chừng. Nói rõ điều đó ở đây vì nó là thứ giáo
    // viên cần cân nhắc: mức giám sát của một bài thi cụ thể do học viên quyết, một lần, và mặc
    // định của họ là cả hai.
    hint: 'Học viên chọn camera, màn hình hoặc cả hai khi vào thi. Chốt một lần, không đổi được giữa chừng.',
    label: 'Cho học viên tự chọn',
    value: 'BOTH_STUDENT_CHOICE',
  },
  {
    hint: 'Tắt hoàn toàn giám sát cho bài này. Không có bản ghi nào và giám thị không mở được màn hình theo dõi.',
    label: 'Không giám sát',
    tone: 'warning',
    value: 'NO_MONITORING',
  },
]

export type ExamSecurePoolStatus = 'SEALED' | 'RELEASED'

export type Paged<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type QuestionSelectionSpec = {
  difficulty?: string | null
  questionType?: string | null
  skillCode?: string | null
  targetBandLevel?: string | null
  topicId?: string | null
}

export type ExamMemberDto = {
  grantedAt?: string | null
  grantedBy?: string | null
  id: string
  role: ExamMemberRole
  userId: string
  user?: {
    email?: string | null
    fullName?: string | null
    id: string
  } | null
}

export type ExamPaperItemDto = {
  blueprintSlotId?: string | null
  id: string
  order: number
  question?: {
    // Chỉ lấy type + durationSeconds: dùng để cộng thời lượng phát AUDIO/VIDEO vào thời gian làm
    // bài (xem getQuestionAttemptSeconds), không phải để hiển thị tài nguyên.
    assets?: Array<{ durationSeconds?: number | null; type?: string | null }> | null
    code?: string | null
    id: string
    maxResponseSeconds?: number | null
    minResponseSeconds?: number | null
    preparationTimeSeconds?: number | null
    questionText?: string | null
    status?: string | null
  } | null
  questionId?: string | null
  sectionId: string
  selectionSpec?: QuestionSelectionSpec | null
  slotType?: ExamBlueprintSlotType | null
  weight?: number | null
}

export type ExamPaperSectionDto = {
  id: string
  instruction?: string | null
  items: ExamPaperItemDto[]
  order: number
  paperId?: string | null
  sectionTimeLimitSeconds?: number | null
  title?: string | null
  weight?: number | null
}

export type ExamPaperDto = {
  blueprintVersionId?: string | null
  code: string
  createdAt?: string | null
  createdBy?: string | null
  examId: string
  id: string
  sections: ExamPaperSectionDto[]
  status: ExamPaperStatus
  timeDurationSeconds?: number | null
  updatedAt?: string | null
  variant: number
}

export type ExamBlueprintSlotDto = {
  fixedQuestion?: {
    // Xem chú thích ở ExamPaperItemDto.question.assets.
    assets?: Array<{ durationSeconds?: number | null; type?: string | null }> | null
    code?: string | null
    id: string
    maxResponseSeconds?: number | null
    minResponseSeconds?: number | null
    preparationTimeSeconds?: number | null
    questionText?: string | null
    status?: string | null
  } | null
  fixedQuestionId?: string | null
  id: string
  order: number
  prepTimeSecondsOverride?: number | null
  responseTimeSecondsOverride?: number | null
  sectionId?: string | null
  selectionSpec?: QuestionSelectionSpec | null
  slotType: ExamBlueprintSlotType
  weight?: number | null
}

export type ExamBlueprintSectionDto = {
  id: string
  instruction?: string | null
  order: number
  sectionTimeLimitSeconds?: number | null
  sectionWeight?: number | null
  slots: ExamBlueprintSlotDto[]
  title: string
}

export type ExamBlueprintVersionDto = {
  blueprintId: string
  code: string
  description?: string | null
  effectiveFrom?: string | null
  effectiveTo?: string | null
  id: string
  sectionCount?: number
  sections: ExamBlueprintSectionDto[]
  slotCount?: number
  status: ExamBlueprintVersionStatus
  totalTimeLimitSeconds?: number | null
  version: number
  weightSum?: number | null
}

export type ExamBlueprintDto = {
  code: string
  currentVersion?: ExamBlueprintVersionDto | null
  createdAt?: string | null
  description?: string | null
  id: string
  isActive: boolean
  languageId: string
  name: string
  sectionCount?: number
  gradeLevelId?: string | null
  schoolId: string
  updatedAt?: string | null
  versionCount?: number
  versions: ExamBlueprintVersionDto[]
}

// State kèm theo khi một trang khác mở trang blueprint / phiên bản blueprint (vd: tab "Chốt khung đề"
// của kỳ thi). Trang blueprint không biết ai gọi nó nên nơi gọi tự khai báo đích "quay lại" của mình;
// `returnState` được truyền nguyên vẹn lại cho trang đích (kỳ thi dùng để mở lại đúng tab).
export type BlueprintNavState = {
  returnLabel?: string
  returnState?: unknown
  returnTo?: string
} | null

export type RubricVersionDto = {
  code: string
  id: string
  name: string
  rubricId: string
  status: ExamBlueprintVersionStatus
  version: number
}

export type RubricDto = {
  code: string
  frameworkId: string
  id: string
  languageId: string
  name: string
  versions: RubricVersionDto[]
}

export type AssessmentPolicyDto = {
  effectiveFrom?: string | null
  effectiveTo?: string | null
  gradeLevel?: { id: string; code?: string | null; name?: string | null } | null
  id: string
  languageId: string
  passingScore?: number | null
  rubricVersion?: RubricVersionDto | null
  rubricVersionId: string
  schoolClass?: { id: string; code?: string | null; name?: string | null } | null
  schoolGrade?: { id: string; code?: string | null; name?: string | null } | null
  status: string
  strictness: AssessmentPolicyStrictness
  targetFrameworkBand?: { code: string; label: string } | null
  version: number
}

export type SchoolRoomLite = {
  code: string
  description?: string | null
  id: string
  name: string
}

/**
 * Bản rút gọn của kỳ thi, dành cho các màn CHỌN kỳ thi.
 *
 * <p>Cố ý không dùng `ExamDto`: query danh sách kỳ thi đầy đủ kéo cả
 * `papers → sections → items` qua DataLoader — quá nặng cho một ô lọc.
 */
export type ExamPickerOption = {
  closeAt?: string | null
  code: string
  id: string
  name: string
  openAt?: string | null
  status: ExamStatus
}

export type ExamScheduleProctorDto = {
  id: string
  scheduleId: string
  teacher?: {
    email?: string | null
    fullName?: string | null
    id: string
  } | null
}

/**
 * Một giáo viên đang vướng lịch: đã gác ca `scheduleId` chạy [startDate, endDate).
 * Chỉ dùng để làm mờ sẵn người bận ở màn chọn giám thị — luật chặn thật nằm ở backend.
 */
export type ProctorBusySlotDto = {
  endDate?: string | null
  scheduleId: string
  startDate?: string | null
  teacherId: string
}

/**
 * Một học sinh đang vướng lịch khi cân nhắc xếp vào `targetScheduleId`: đã được xếp ca
 * `busyScheduleId` chạy [startDate, endDate).
 * Chỉ dùng để làm mờ sẵn lựa chọn bị trùng — luật chặn thật nằm ở backend.
 */
export type StudentBusySlotDto = {
  busyScheduleId: string
  endDate?: string | null
  startDate?: string | null
  studentId: string
  targetScheduleId: string
}

export type ExamScheduleDto = {
  candidateCount: number
  endDate?: string | null
  examId: string
  id: string
  movedToScheduleId?: string | null
  proctors: ExamScheduleProctorDto[]
  requiredProctorCount: number
  room?: SchoolRoomLite | null
  schoolRoomId?: string | null
  startDate?: string | null
  status: ExamScheduleStatus
}

/**
 * Đủ để dựng bước "Xếp lịch" của thanh tiến độ. Trang danh sách kỳ thi chỉ chọn bấy nhiêu field
 * (`schedules { id status }`) nên đừng ép nó về `ExamScheduleDto` đầy đủ.
 */
export type ExamScheduleStatusDto = Pick<ExamScheduleDto, 'id' | 'status'>

export type ExamSecurePoolDto = {
  id: string
  status: ExamSecurePoolStatus
}

export type ExamScheduleOtpDto = {
  expiresSeconds: number
  otp: string
}

export type ExamAttemptSummaryDto = {
  /** Lý do lượt thi bị xóa, đi cùng `status === 'DELETED'`. */
  deletedReason?: string | null
  flagged: boolean
  flagReason?: string | null
  resultStatus?: string | null
  rubricResultBandCode?: string | null
  rubricResultBandName?: string | null
  /**
   * Thang điểm của rubric đã chấm ĐÚNG lượt này. Danh sách lượt thi trộn nhiều kỳ, mỗi kỳ có thể
   * dùng rubric khác thang, nên không suy chung được -- phải đọc theo từng dòng.
   */
  scoringScaleMax?: number | null
  scoringScaleMin?: number | null
  sessionId: string
  startedAt?: string | null
  status: string
  submittedAt?: string | null
  totalScore?: number | null
}

export type ExamCandidateDto = {
  assignedAt?: string | null
  assignedPaperId?: string | null
  attempts: ExamAttemptSummaryDto[]
  blockedAt?: string | null
  examId: string
  id: string
  latestSessionId?: string | null
  officialAttempt?: ExamAttemptSummaryDto | null
  officialScore?: number | null
  scheduleId?: string | null
  status: ExamCandidateStatus
  student?: {
    email?: string | null
    fullName?: string | null
    id: string
  } | null
  studentId: string
}

export type ProctorScheduleSummaryDto = {
  endDate?: string | null
  examId: string
  examName?: string | null
  roomName?: string | null
  scheduleId: string
  schoolRoomId?: string | null
  startDate?: string | null
  status?: string | null
}

export type ProctorCandidateSummaryDto = {
  blockedAt?: string | null
  candidateId: string
  sessionFlagged: boolean
  sessionId?: string | null
  sessionStatus?: string | null
  status: ExamCandidateStatus | string
  studentEmail?: string | null
  studentId: string
  studentName?: string | null
}

export function getScheduleLabel(schedule: Pick<ExamScheduleDto, 'room'>) {
  return schedule.room?.code ?? schedule.room?.name ?? 'Ca thi'
}

export function getCandidateName(candidate: Pick<ExamCandidateDto, 'student' | 'studentId'>) {
  return candidate.student?.fullName ?? candidate.student?.email ?? candidate.studentId
}

export type ExamDto = {
  assessmentPolicyId?: string | null
  blueprint?: ExamBlueprintDto | null
  blueprintId?: string | null
  blueprintVersionId?: string | null
  // Số thí sinh do BE đếm sẵn (DataLoader examCandidateCountByExamId). Trang danh sách dựa vào nó để
  // dựng bước "Thêm thí sinh" mà không phải tải cả danh sách thí sinh của từng dòng.
  candidateCount?: number
  closeAt?: string | null
  code: string
  createdAt?: string | null
  deliveryMode?: ExamDeliveryMode
  description?: string | null
  // Thời gian làm bài của kỳ thi, tính bằng GIÂY. BE tự tính = MAX(thời lượng) trên các
  // mã đề, nên đây là field CHỈ ĐỌC — FE không gửi lên ở create/update. Dùng nó để dựng
  // ràng buộc "ca thi phải dài tối thiểu bằng thời gian làm bài" (xem CreateScheduleModal).
  examTimeDurationSecond?: number | null
  id: string
  kind: ExamKind
  languageId: string
  maxAttempt?: number | null
  members: ExamMemberDto[]
  name: string
  openAt?: string | null
  papers: ExamPaperDto[]
  papersLocked?: boolean | null
  // Cấu hình giám sát BE lưu thành 1 enum gộp; dùng toExamStreamSetup() để đưa về union 5 nhánh
  // mà UI thao tác, đừng đọc thẳng hai trường này ra form.
  requiredStreamType?: ExamRequiredStreamType | null
  requiresOtp: boolean
  /** Ngưỡng tin cậy AI theo phần trăm (0-100); null = nhà trường không đặt. */
  aiConfidenceThresholdPercent?: number | null
  resultDecisionMethod?: ResultDecisionMethod | null
  // Chỉ có ở query danh sách kỳ thi; trang chi tiết dùng useExamSchedulesQuery (đầy đủ phòng/giám thị).
  schedules?: ExamScheduleStatusDto[]
  schoolClassId?: string | null
  schoolId: string
  securePool?: ExamSecurePoolDto | null
  status: ExamStatus
  streamTypePermission?: ExamStreamTypePermission | null
  updatedAt?: string | null
}

export type UpdateExamRequest = {
  /** Ngưỡng tin cậy AI theo phần trăm (0-100). Bỏ trống = GIỮ NGUYÊN giá trị hiện có. */
  aiConfidenceThresholdPercent?: number | null
  assessmentPolicyId?: string | null
  closeAt?: string | null
  description?: string | null
  maxAttempt?: number | null
  name?: string
  openAt?: string | null
  // Bỏ trống = giữ nguyên cấu hình giám sát; mảng RỖNG mới là tắt giám sát. Dùng
  // toUpdateStreamPayload() thay vì tự ghép, EXAM_STREAM_SETUP_PAYLOAD dành cho luồng tạo.
  requiredStreamTypes?: ExamStreamType[] | null
  requiresOtp?: boolean | null
  resultDecisionMethod?: ResultDecisionMethod | null
  streamTypePermission?: ExamStreamTypePermission | null
}

export type UpdateExamStatusRequest = {
  action: 'CANCEL' | 'CLOSE' | 'PUBLISH_RESULTS' | 'SCHEDULE' | 'START'
  note?: string | null
}

export type UpdateExamSecurePoolStatusRequest = {
  action: 'RELEASE'
}

export type CreateExamBlueprintRequest = {
  code: string
  description?: string | null
  languageId: string
  name: string
  gradeLevelId?: string | null
}

export type CreateExamPaperRequest = {
  copyFromPaperId?: string | null
  /** Chỉ gửi kèm `source: 'questions'`. */
  sections?: ExamPaperSectionInput[] | null
  source?: CreateExamPaperSource | null
}

export type ExamPaperQuestionInput = {
  questionId: string
  weight: number
}

export type ExamPaperSectionInput = {
  instruction?: string | null
  questions: ExamPaperQuestionInput[]
  title: string
  weight?: number | null
}

export type UpdateExamPaperItemRequest = {
  questionId: string
}

export type UpdateExamPaperSectionRequest = {
  instruction?: string | null
  title?: string | null
}

export type UpdateExamPaperStatusRequest = {
  action: 'APPROVE' | 'LOCK' | 'REOPEN' | 'REQUEST_REVISION' | 'SUBMIT'
  note?: string | null
}

export type UpdateExamBlueprintVersionStatusRequest = {
  action: 'ARCHIVE' | 'PUBLISH'
  note?: string | null
}

export function formatNullableText(value?: string | null) {
  return value?.trim() ? value : '-'
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
  }).format(date)
}

export function toIsoDateTime(value: string): string | null {
  if (!value) {
    return null
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function toDateTimeLocalValue(value?: string | null): string {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatDurationSeconds(value?: number | null): string {
  if (value == null) {
    return '-'
  }
  if (value < 60) {
    return `${value} giây`
  }
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return seconds === 0 ? `${minutes} phút` : `${minutes} phút ${seconds} giây`
}

export function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
  }).format(date)
}

export function getExamStatusDisplay(status?: ExamStatus | string | null): { tone: StatusTone; label: string } {
  switch (status) {
    case 'DRAFT':
      return { tone: 'warning', label: 'Bản nháp' }
    case 'SCHEDULED':
      return { tone: 'info', label: 'Đã lên lịch' }
    case 'IN_PROGRESS':
      return { tone: 'violet', label: 'Đang diễn ra' }
    case 'CLOSED':
      return { tone: 'neutral', label: 'Đã đóng' }
    case 'RESULTS_PUBLISHED':
      return { tone: 'success', label: 'Đã công bố kết quả' }
    case 'CANCELLED':
      return { tone: 'danger', label: 'Đã hủy' }
    default:
      return { tone: 'neutral', label: String(status ?? '-') }
  }
}

/**
 * Kỳ thi đã bắt đầu trở đi thì backend khóa chỉnh sửa thông tin kỳ thi và mọi thao tác xếp lịch
 * (xem Exam.isLockedForEditing ở BE). Ẩn nút trước cho khớp thay vì để người dùng bấm rồi ăn lỗi.
 */
export function isExamLockedForEditing(status?: ExamStatus | string | null): boolean {
  return status === 'IN_PROGRESS' || status === 'CLOSED' || status === 'RESULTS_PUBLISHED' || status === 'CANCELLED'
}

/**
 * Kỳ thi đã chốt sổ: không xóa bài thi được nữa (backend chặn bằng `Exam.isResultsFinalized`).
 *
 * <p>Hẹp hơn `isExamLockedForEditing` và cố ý: kỳ thi ĐANG diễn ra vẫn phải xóa được bài — gỡ một
 * lượt hỏng ngay giữa buổi thi chính là việc tính năng này sinh ra để làm. Kỳ đã hủy cũng cho xóa
 * để dọn dữ liệu rác.
 */
export function isExamResultsFinalized(status?: ExamStatus | string | null): boolean {
  return status === 'CLOSED' || status === 'RESULTS_PUBLISHED'
}

export function getMemberRoleDisplay(role?: ExamMemberRole | null) {
  switch (role) {
    case 'CHAIR':
      return 'Chủ tịch hội đồng'
    case 'AUTHOR':
      return 'Ra đề'
    case 'REVIEWER':
      return 'Duyệt đề'
    default:
      return String(role ?? '-')
  }
}

export function getExamPaperStatusDisplay(status?: string | null, examKind?: ExamKind): { tone: StatusTone; label: string } {
  // Bài trên lớp không đi qua luồng duyệt của kỳ thi tập trung: giáo viên tự khoá mã đề một bước
  // (DRAFT → LOCKED) để mở đường phân đề, và mở lại được bất cứ lúc nào. Nên LOCKED ở đây nghĩa là
  // "sẵn sàng phân cho học sinh", không phải "đã chốt không đụng vào được nữa".
  if (status === 'LOCKED' && examKind === 'CLASS_TEST') {
    return { tone: 'success', label: 'Sẵn sàng phân đề' }
  }
  switch (status) {
    case 'DRAFT':
      return { tone: 'warning', label: 'Bản nháp' }
    case 'IN_REVIEW':
      return { tone: 'info', label: 'Đang duyệt' }
    case 'APPROVED':
      return { tone: 'success', label: 'Đã duyệt' }
    case 'LOCKED':
      return { tone: 'neutral', label: 'Đã khóa' }
    default:
      return { tone: 'neutral', label: String(status ?? '-') }
  }
}

export function getBlueprintVersionStatusDisplay(status?: string | null): { tone: StatusTone; label: string } {
  switch (status) {
    case 'DRAFT':
      return { tone: 'warning', label: 'Bản nháp' }
    case 'PUBLISHED':
      return { tone: 'success', label: 'Đã xuất bản' }
    case 'ARCHIVED':
      return { tone: 'neutral', label: 'Lưu trữ' }
    default:
      return { tone: 'neutral', label: String(status ?? '-') }
  }
}

export function getAssessmentPolicyStrictnessLabel(strictness?: AssessmentPolicyStrictness | string | null): string {
  switch (strictness) {
    case 'LENIENT':
      return 'Nới lỏng'
    case 'STANDARD':
      return 'Tiêu chuẩn'
    case 'STRICT':
      return 'Nghiêm ngặt'
    default:
      return '-'
  }
}

// Lớp > Niên khóa > Khối > "Toàn trường" -- cùng thứ tự ưu tiên đã dùng ở
// assessment_policy_school/components/AssessmentPolicyTable.tsx, để phân biệt các Assessment
// Policy dùng chung 1 Rubric Version nhưng khác phạm vi (vd. CENTRALIZE theo Khối vs CLASS_TEST
// neo vào 1 Lớp cụ thể) khi chúng hiện cạnh nhau trong danh sách "chọn một".
// Trường có thể đã đặt tên khối/niên khóa/lớp bao gồm sẵn tiền tố (vd. "Khối 10" thay vì "10", vì
// form tạo khối trước đây gợi ý placeholder như vậy) -- bỏ tiền tố lặp thay vì nối thô, tránh hiện
// "Khối Khối 10".
function withScopePrefix(prefix: string, name: string | null | undefined): string {
  const trimmed = (name ?? '').trim()
  const alreadyPrefixed = trimmed.toLowerCase().startsWith(prefix.toLowerCase())
  return alreadyPrefixed ? trimmed : `${prefix} ${trimmed}`
}

export function getAssessmentPolicyScopeLabel(
  policy: Pick<AssessmentPolicyDto, 'gradeLevel' | 'schoolGrade' | 'schoolClass'>,
): string {
  if (policy.schoolClass) return withScopePrefix('Lớp', policy.schoolClass.name || policy.schoolClass.code)
  if (policy.schoolGrade) return withScopePrefix('Niên khóa', policy.schoolGrade.name || policy.schoolGrade.code)
  if (policy.gradeLevel) return withScopePrefix('Khối', policy.gradeLevel.name || policy.gradeLevel.code)
  return 'Toàn trường'
}

export function getQuestionDifficultyDisplay(difficulty?: string | null): string {
  switch (difficulty) {
    case 'EASY':
      return 'Dễ'
    case 'MEDIUM':
      return 'Trung bình'
    case 'HARD':
      return 'Khó'
    default:
      return '-'
  }
}

export function getCandidateStatusDisplay(status?: string | null): { tone: StatusTone; label: string } {
  switch (status) {
    case 'ASSIGNED':
      return { tone: 'warning', label: 'Chưa điểm danh' }
    case 'ATTENDED':
      return { tone: 'success', label: 'Đã có mặt' }
    case 'ABSENT':
      return { tone: 'danger', label: 'Vắng thi' }
    case 'COMPLETED':
      return { tone: 'info', label: 'Đã hoàn thành' }
    case 'EXEMPTED':
    case 'CANCELLED':
      return { tone: 'neutral', label: 'Miễn thi' }
    default:
      return { tone: 'warning', label: 'Chưa xếp ca' }
  }
}

export function getResultDecisionMethodDisplay(method?: ResultDecisionMethod | string | null): string {
  switch (method) {
    case 'HIGHEST':
      return 'Điểm cao nhất'
    case 'LATEST':
      return 'Lượt mới nhất'
    case 'AVERAGE':
      return 'Điểm trung bình'
    case 'FIRST':
      return 'Lượt đầu tiên'
    case 'LOWEST':
      return 'Điểm thấp nhất'
    default:
      return '-'
  }
}

export function getExamChairName(members: Pick<ExamMemberDto, 'role' | 'user' | 'userId'>[]): string {
  const chair = members.find((member) => member.role === 'CHAIR')
  if (!chair) {
    return '-'
  }
  return chair.user?.fullName ?? chair.user?.email ?? chair.userId
}

export function getScheduleStatusDisplay(status?: string | null): { tone: StatusTone; label: string } {
  switch (status) {
    case 'DRAFT':
      return { tone: 'warning', label: 'Bản nháp' }
    case 'PUBLISHED':
      return { tone: 'success', label: 'Sẵn sàng' }
    case 'COMPLETED':
      return { tone: 'neutral', label: 'Đã hoàn thành' }
    case 'MOVED':
      return { tone: 'info', label: 'Đã dời ca' }
    case 'CANCELLED':
      return { tone: 'danger', label: 'Đã hủy' }
    default:
      return { tone: 'neutral', label: String(status ?? '-') }
  }
}

