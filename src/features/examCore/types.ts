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

export type CreateExamPaperSource = 'blueprint' | 'copy'

export type ExamCandidateStatus = 'ASSIGNED' | 'ATTENDED' | 'ABSENT' | 'COMPLETED' | 'EXEMPTED' | 'CANCELLED'

export type ExamScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'MOVED' | 'CANCELLED'

export type ExamDeliveryMode = 'DEVICE' | 'LAB'

export type ResultDecisionMethod = 'HIGHEST' | 'LATEST' | 'AVERAGE' | 'FIRST' | 'LOWEST'

export const RESULT_DECISION_METHODS: ResultDecisionMethod[] = ['HIGHEST', 'LATEST', 'AVERAGE', 'FIRST', 'LOWEST']
export type AssessmentPolicyStrictness = 'LENIENT' | 'STANDARD' | 'STRICT'


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
  schoolGradeLevelId?: string | null
  schoolId: string
  updatedAt?: string | null
  versionCount?: number
  versions: ExamBlueprintVersionDto[]
}

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
  id: string
  languageId: string
  passingScore?: number | null
  rubricVersion?: RubricVersionDto | null
  rubricVersionId: string
  status: string
  strictness: AssessmentPolicyStrictness
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

export type ExamSecurePoolDto = {
  id: string
  status: ExamSecurePoolStatus
}

export type ExamScheduleOtpDto = {
  expiresSeconds: number
  otp: string
}

export type ExamAttemptSummaryDto = {
  flagged: boolean
  flagReason?: string | null
  resultStatus?: string | null
  rubricResultBandCode?: string | null
  rubricResultBandName?: string | null
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
  requiresOtp: boolean
  resultDecisionMethod?: ResultDecisionMethod | null
  schoolClassId?: string | null
  schoolId: string
  securePool?: ExamSecurePoolDto | null
  status: ExamStatus
  updatedAt?: string | null
}

export type UpdateExamRequest = {
  closeAt?: string | null
  description?: string | null
  maxAttempt?: number | null
  name?: string
  openAt?: string | null
  requiresOtp?: boolean | null
  resultDecisionMethod?: ResultDecisionMethod | null
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
  schoolGradeLevelId?: string | null
}

export type CreateExamPaperRequest = {
  copyFromPaperId?: string | null
  source?: CreateExamPaperSource | null
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

export function getExamPaperStatusDisplay(status?: string | null, examKind?: ExamKind): { tone: StatusTone; label: string } {
  // Bài trên lớp luôn tạo mã đề ở trạng thái LOCKED làm mặc định (không dùng luồng duyệt như kỳ thi tập trung),
  // nên với CLASS_TEST, LOCKED nghĩa là "sẵn sàng dùng", không phải "đã khóa không sửa được".
  if (status === 'LOCKED' && examKind === 'CLASS_TEST') {
    return { tone: 'success', label: 'Sẵn sàng' }
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

