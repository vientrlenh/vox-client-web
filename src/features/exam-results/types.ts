import type { StatusTone } from '@/shared/ui/StatusBadge'

export type StudentExamSummaryDto = {
  description?: string | null
  duration: number
  examDate?: string | null
  id: string
  sessionId?: string | null
  status: string
  subject: string
  title: string
}

export type ExamResultSectionDto = {
  score: number
  sectionId: string
  title?: string | null
}

export type ExamResultItemDto = {
  itemScore: number
  paperItemId: string
  responseId: string
  sectionId: string
  weightedScore: number
}

export type ExamCandidateResultDto = {
  candidateId: string
  examId: string
  id: string
  items: ExamResultItemDto[]
  paperId: string
  rubricResultBandCode?: string | null
  rubricResultBandId?: string | null
  rubricResultBandName?: string | null
  sections: ExamResultSectionDto[]
  sessionId: string
  status: string
  targetFrameworkBandCode?: string | null
  targetFrameworkBandId?: string | null
  targetFrameworkBandLabel?: string | null
  totalScore: number
}

export type ExamItemCriterionScoreDto = {
  criterionCode?: string | null
  criterionName?: string | null
  finalScore: number
  id: string
  rationale?: string | null
  rawScore: number
  rubricCriterionId: string
}

export type ExamValidityRuleResultDto = {
  action?: string | null
  blocking?: boolean | null
  category?: string | null
  message?: string | null
  ruleId?: string | null
  severity?: string | null
  targetCriteria?: string[] | null
}

export type ExamValidityDto = {
  action?: string | null
  overallSeverity?: string | null
  ruleResults?: ExamValidityRuleResultDto[] | null
  validForScoring?: boolean | null
}

export type PhonemeFeedbackDto = {
  accuracyScore?: number | null
  color?: string | null
  level?: string | null
  note?: string | null
  phoneme: string
}

export type WordFeedbackDto = {
  accuracyScore?: number | null
  color?: string | null
  errorNote?: string | null
  level?: string | null
  phonemes?: PhonemeFeedbackDto[] | null
  word: string
}

export type ExamItemEvaluationTurnDto = {
  asrConfidence?: number | null
  audioUrl?: string | null
  durationSeconds?: number | null
  id: string
  pronunciationOverall?: unknown
  promptText?: string | null
  transcript?: string | null
  turnOrder: number
  turnType: string
  wordCount?: number | null
  wordFeedback?: WordFeedbackDto[] | null
}

export type ExamItemEvaluationDto = {
  criteria: ExamItemCriterionScoreDto[]
  evaluatedAt?: string | null
  feedbackSummary?: string | null
  gradedByModel?: string | null
  id: string
  itemScore: number
  markedInvalid: boolean
  overallConfidence?: number | null
  paperItemId: string
  promptVersion?: string | null
  rawItemScore: number
  requiresRetake: boolean
  responseId: string
  signals?: unknown
  status: string
  suggestions?: unknown
  turns: ExamItemEvaluationTurnDto[]
  validity?: ExamValidityDto | null
}

export function formatScore(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-'
  }

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value)
}

export function getExamResultStatusDisplay(status?: string | null): { label: string; tone: StatusTone } {
  switch (status) {
    case 'PENDING_REVIEW':
      return { label: 'Chờ duyệt', tone: 'warning' }
    case 'RELEASED':
      return { label: 'Đã công bố', tone: 'success' }
    case 'FINAL':
      return { label: 'Chốt điểm', tone: 'success' }
    case 'APPEALED':
      return { label: 'Đang khiếu nại', tone: 'violet' }
    case 'RE_GRADING':
      return { label: 'Đang chấm lại', tone: 'info' }
    case 'INVALID':
      return { label: 'Không hợp lệ', tone: 'danger' }
    case 'RETAKE_REQUIRED':
      return { label: 'Cần thi lại', tone: 'danger' }
    default:
      return { label: status ?? 'Chưa có kết quả', tone: 'neutral' }
  }
}

export function getStudentExamStatusDisplay(status?: string | null): { label: string; tone: StatusTone } {
  switch (status) {
    case 'upcoming':
      return { label: 'Sắp diễn ra', tone: 'info' }
    case 'in_progress':
      return { label: 'Đang diễn ra', tone: 'warning' }
    case 'completed':
      return { label: 'Đã kết thúc', tone: 'neutral' }
    default:
      return { label: status ?? 'Không rõ', tone: 'neutral' }
  }
}
