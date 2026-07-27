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

// Đã chuyển xuống `examCore` để các màn dùng chung (kể cả picker) khỏi phải import ngược
// lên feature `exam`. Re-export để call-site cũ không phải đổi.
export { getExamStatusDisplay } from '@/features/examCore/types'

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
