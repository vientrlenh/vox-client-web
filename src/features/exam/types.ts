import type { StatusTone } from '@/shared/ui/StatusBadge'
import type { ExamMemberRole, ExamStatus, ResultDecisionMethod } from '@/features/examCore/types'

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
}

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
