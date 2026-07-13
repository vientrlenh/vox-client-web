import type { StatusTone } from '@/shared/ui/StatusBadge'
import type { ExamDto, ExamStatus, ResultDecisionMethod } from '@/features/examCore/types'

export type ClassTestSectionInput = {
  instruction?: string | null
  questionIds: string[]
  title: string
  weight?: number | null
}

export type CreateClassTestRequest = {
  closeAt?: string | null
  description?: string | null
  existingBlueprintId?: string | null
  existingBlueprintVersionId?: string | null
  maxAttempt?: number | null
  name: string
  openAt?: string | null
  questionIds?: string[] | null
  resultDecisionMethod?: ResultDecisionMethod | null
  sections?: ClassTestSectionInput[] | null
  schoolClassId: string
}

export type UpdateClassTestQuestionsRequest = {
  questionIds?: string[]
  sections?: ClassTestSectionInput[]
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

export function getClassTestStatusDisplay(status?: ExamStatus | string | null): { tone: StatusTone; label: string } {
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
