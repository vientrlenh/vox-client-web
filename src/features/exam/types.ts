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
  paperId?: string | null
  question?: {
    code?: string | null
    id: string
    questionText?: string | null
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

export type ExamSecurePoolDto = {
  embargoUntil?: string | null
  examId: string
  id: string
  releasedAt?: string | null
  releasedBy?: string | null
  releaseMode: 'AUTO_AFTER_CLOSE' | 'MANUAL'
  status: 'RELEASED' | 'SEALED'
}

export type ExamDto = {
  assessmentPolicyId?: string | null
  blueprintId?: string | null
  blueprintVersionId?: string | null
  closeAt?: string | null
  code: string
  createdAt?: string | null
  createdBy?: string | null
  description?: string | null
  id: string
  kind: ExamKind
  languageId: string
  members?: ExamMemberDto[]
  name: string
  openAt?: string | null
  papers?: ExamPaperDto[]
  schoolClassId?: string | null
  schoolId: string
  securePool?: ExamSecurePoolDto | null
  status: ExamStatus
  updatedAt?: string | null
  updatedBy?: string | null
}

export type ExamPage = {
  content: ExamDto[]
  page: number
  size: number
  totalElements: number
  totalPages: number
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
  sections: ExamBlueprintSectionDto[]
  status: ExamBlueprintVersionStatus
  totalTimeLimitSeconds?: number | null
  version: number
}

export type ExamBlueprintDto = {
  code: string
  createdAt?: string | null
  description?: string | null
  id: string
  isActive: boolean
  languageId: string
  name: string
  schoolGradeLevelId?: string | null
  schoolId: string
  updatedAt?: string | null
  versions?: ExamBlueprintVersionDto[]
}

export type ExamBlueprintPage = {
  content: ExamBlueprintDto[]
  page: number
  size: number
  totalElements: number
  totalPages: number
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

export type UpdateExamRequest = {
  assessmentPolicyId?: string | null
  blueprintId?: string | null
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

export type UpdateExamMemberRequest = {
  role: ExamMemberRole
}

export type CreateExamBlueprintRequest = {
  code: string
  description?: string | null
  languageId: string
  name: string
  schoolGradeLevelId?: string | null
}

export type ExamBlueprintSlotInput = {
  fixedQuestionId?: string | null
  order: number
  prepTimeSecondsOverride?: number | null
  responseTimeSecondsOverride?: number | null
  selectionSpec?: QuestionSelectionSpec | null
  slotType: ExamBlueprintSlotType
  weight?: number | null
}

export type ExamBlueprintSectionInput = {
  instruction?: string | null
  order: number
  sectionTimeLimitSeconds?: number | null
  sectionWeight?: number | null
  slots: ExamBlueprintSlotInput[]
  title: string
}

export type CreateExamBlueprintVersionRequest = {
  effectiveFrom?: string | null
  effectiveTo?: string | null
  sections: ExamBlueprintSectionInput[]
  totalTimeLimitSeconds?: number | null
}

export type CreateExamBlueprintSectionRequest = {
  instruction?: string | null
  order: number
  sectionTimeLimitSeconds?: number | null
  sectionWeight?: number | null
  title: string
}

export type UpdateExamBlueprintSectionRequest = CreateExamBlueprintSectionRequest

export type CreateExamBlueprintSlotRequest = {
  fixedQuestionId?: string | null
  order: number
  prepTimeSecondsOverride?: number | null
  responseTimeSecondsOverride?: number | null
  selectionSpec?: QuestionSelectionSpec | null
  slotType: ExamBlueprintSlotType
  weight?: number | null
}

export type UpdateExamBlueprintSlotRequest = CreateExamBlueprintSlotRequest

export type UpdateExamBlueprintRequest = {
  description?: string | null
  name?: string
}

export type UpdateExamBlueprintVersionStatusRequest = {
  action: 'ARCHIVE' | 'PUBLISH'
  note?: string | null
}

export type CreateClassTestRequest = {
  closeAt?: string | null
  description?: string | null
  existingBlueprintId?: string | null
  existingBlueprintVersionId?: string | null
  name: string
  openAt?: string | null
  questionIds?: string[] | null
  schoolClassId: string
}

export type UpdateClassTestQuestionsRequest = {
  questionIds: string[]
}

export type UpdateExamPaperItemRequest = {
  questionId: string
}

export type UpdateExamPaperStatusRequest = {
  action: 'APPROVE' | 'LOCK' | 'REQUEST_REVISION' | 'SUBMIT'
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

export function getExamStatusDisplay(status?: string | null) {
  switch (status) {
    case 'DRAFT':
      return { className: 'border-amber-200 bg-amber-50 text-amber-700', label: 'Bản nháp' }
    case 'SCHEDULED':
      return { className: 'border-blue-200 bg-blue-50 text-blue-700', label: 'Đã lên lịch' }
    case 'IN_PROGRESS':
      return { className: 'border-violet-200 bg-violet-50 text-violet-700', label: 'Đang diễn ra' }
    case 'CLOSED':
      return { className: 'border-slate-200 bg-slate-100 text-slate-700', label: 'Đã đóng' }
    case 'RESULTS_PUBLISHED':
      return { className: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Đã công bố kết quả' }
    case 'CANCELLED':
      return { className: 'border-red-200 bg-red-50 text-red-700', label: 'Đã hủy' }
    default:
      return { className: 'border-slate-200 bg-slate-50 text-slate-600', label: String(status ?? '-') }
  }
}

export function getExamPaperStatusDisplay(status?: string | null) {
  switch (status) {
    case 'DRAFT':
      return { className: 'border-amber-200 bg-amber-50 text-amber-700', label: 'Bản nháp' }
    case 'IN_REVIEW':
      return { className: 'border-blue-200 bg-blue-50 text-blue-700', label: 'Đang duyệt' }
    case 'APPROVED':
      return { className: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Đã duyệt' }
    case 'LOCKED':
      return { className: 'border-slate-200 bg-slate-100 text-slate-700', label: 'Đã khóa' }
    default:
      return { className: 'border-slate-200 bg-slate-50 text-slate-600', label: String(status ?? '-') }
  }
}

export function getBlueprintVersionStatusDisplay(status?: string | null) {
  switch (status) {
    case 'DRAFT':
      return { className: 'border-amber-200 bg-amber-50 text-amber-700', label: 'Bản nháp' }
    case 'PUBLISHED':
      return { className: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Đã xuất bản' }
    case 'ARCHIVED':
      return { className: 'border-slate-200 bg-slate-100 text-slate-700', label: 'Lưu trữ' }
    default:
      return { className: 'border-slate-200 bg-slate-50 text-slate-600', label: String(status ?? '-') }
  }
}
