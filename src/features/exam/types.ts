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

export type ExamCandidateStatus = 'ASSIGNED' | 'ABSENT' | 'COMPLETED' | 'EXEMPTED'

export type ExamScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'MOVED' | 'CANCELLED'

export type ExamDeliveryMode = 'DEVICE' | 'LAB'

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
}

export type ExamPaperDto = {
  blueprintVersionId?: string | null
  code: string
  createdAt?: string | null
  examId: string
  id: string
  sections: ExamPaperSectionDto[]
  status: ExamPaperStatus
  updatedAt?: string | null
  variant: number
}

export type ExamBlueprintSlotDto = {
  fixedQuestion?: {
    code?: string | null
    id: string
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

export type ExamRoomDto = {
  capacity: number
  code: string
  id: string
  occupied: number
  scheduleId: string
}

export type ExamProctorDto = {
  id: string
  scheduleId: string
  teacherId: string
  teacherName: string
}

export type ExamScheduleDto = {
  candidateCount: number
  endDate: string
  examId: string
  id: string
  label: string
  proctors: ExamProctorDto[]
  requiredProctorCount: number
  roomIds: string[]
  startDate: string
  status: ExamScheduleStatus
}

export type ExamCandidateDto = {
  examId: string
  id: string
  paperId?: string | null
  roomId?: string | null
  scheduleId?: string | null
  sbd: string
  schoolClassId: string
  schoolClassName: string
  status: ExamCandidateStatus
  studentId: string
  studentName: string
}

export type ExamDto = {
  blueprintId?: string | null
  blueprintVersionId?: string | null
  closeAt?: string | null
  code: string
  createdAt?: string | null
  deliveryMode?: ExamDeliveryMode
  description?: string | null
  id: string
  kind: ExamKind
  languageId: string
  members: ExamMemberDto[]
  name: string
  openAt?: string | null
  papers: ExamPaperDto[]
  schoolClassId?: string | null
  schoolClassName?: string | null
  schoolId: string
  status: ExamStatus
  teacherName?: string | null
  updatedAt?: string | null
}

export type CreateExamRequest = {
  assessmentPolicyId?: string | null
  blueprintId?: string | null
  closeAt?: string | null
  code: string
  description?: string | null
  languageId: string
  name: string
  openAt?: string | null
}

export type ClassTestSectionInput = {
  instruction?: string | null
  questionIds: string[]
  title: string
}

export type CreateClassTestRequest = {
  closeAt?: string | null
  description?: string | null
  existingBlueprintId?: string | null
  existingBlueprintVersionId?: string | null
  name: string
  openAt?: string | null
  questionIds?: string[] | null
  sections?: ClassTestSectionInput[] | null
  schoolClassId: string
}

export type UpdateExamRequest = {
  closeAt?: string | null
  description?: string | null
  name?: string
  openAt?: string | null
}

export type UpdateExamStatusRequest = {
  action: 'CANCEL' | 'CLOSE' | 'PUBLISH_RESULTS' | 'SCHEDULE' | 'START'
  note?: string | null
}

export type CreateExamMemberRequest = {
  role: ExamMemberRole
  userId: string
}

export type CreateExamBlueprintRequest = {
  code: string
  description?: string | null
  languageId: string
  name: string
  schoolGradeLevelId?: string | null
}

export type UpdateClassTestQuestionsRequest = {
  questionIds?: string[]
  sections?: ClassTestSectionInput[]
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

export type ChangeClassTestBlueprintRequest = {
  blueprintId?: string | null
  blueprintVersionId?: string | null
}

export type CreateClassTestResponse = {
  candidateCount: number
  exam: ExamDto
  paperId: string
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

export function getExamStatusDisplay(status?: string | null): { tone: StatusTone; label: string } {
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

export function getClassTestStatusDisplay(status?: string | null): { tone: StatusTone; label: string } {
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

export function getCandidateStatusDisplay(status?: string | null): { tone: StatusTone; label: string } {
  switch (status) {
    case 'ASSIGNED':
      return { tone: 'success', label: 'Đã vào phòng' }
    case 'ABSENT':
      return { tone: 'danger', label: 'Vắng thi' }
    case 'COMPLETED':
      return { tone: 'info', label: 'Đã hoàn thành' }
    case 'EXEMPTED':
      return { tone: 'neutral', label: 'Miễn thi' }
    default:
      return { tone: 'warning', label: 'Chưa xếp phòng' }
  }
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

export function getMemberRoleDisplay(role?: ExamMemberRole | null) {
  switch (role) {
    case 'CHAIR':
      return 'Chủ tịch (CHAIR)'
    case 'AUTHOR':
      return 'Soạn đề (AUTHOR)'
    case 'REVIEWER':
      return 'Phản biện (REVIEWER)'
    default:
      return String(role ?? '-')
  }
}
