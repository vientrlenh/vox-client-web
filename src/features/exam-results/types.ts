import type { StatusTone } from '@/shared/ui/StatusBadge'

export type StudentExamSummaryDto = {
  attemptsUsed: number
  canEnter: boolean
  description?: string | null
  duration: number
  examDate?: string | null
  id: string
  kind?: string | null
  entryMessage?: string | null
  maxAttempt?: number | null
  requiresOtp: boolean
  sessions: StudentExamSessionSummaryDto[]
  status: string
  subject: string
  title: string
}

export type StudentExamSessionSummaryDto = {
  attemptNumber: number
  flagged: boolean
  sessionId: string
  status: string
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
  flagged: boolean
  flagReason?: string | null
  id: string
  items: ExamResultItemDto[]
  paperId: string
  scoreVisible: boolean
  rubricResultBandCode?: string | null
  rubricResultBandId?: string | null
  rubricResultBandName?: string | null
  sections: ExamResultSectionDto[]
  sessionId: string
  status: string
  targetFrameworkBandCode?: string | null
  targetFrameworkBandId?: string | null
  targetFrameworkBandLabel?: string | null
  totalScore?: number | null
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
  evidence?: Record<string, unknown> | null
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

export type ExamEvaluationSignalsDto = {
  asrConfidenceAvg?: number | null
  audioGateReasonCodes?: string[] | null
  audioGateStatus?: 'HARD_FAIL' | 'PASS' | 'SOFT_WARN' | 'UNKNOWN' | null
  audioQuality?: number | null
  codeSwitchingRatio?: number | null
  confidenceMode?: 'HIGH_STAKES' | 'MOCK_TEST' | 'PRACTICE' | null
  durationSeconds?: number | null
  evidenceReasonCodes?: string[] | null
  evidenceStatus?: 'INSUFFICIENT_EVIDENCE' | 'SUFFICIENT' | null
  expectedMinWords?: number | null
  lengthRatio?: number | null
  offTopicRatio?: number | null
  sentenceCount?: number | null
  silenceRatio?: number | null
  speechRate?: number | null
  topicRelevanceScore?: number | null
  uncertaintyType?: 'INSUFFICIENT_EVIDENCE' | 'MIXED' | 'NONE' | 'SYSTEM_UNCERTAINTY' | null
  wordCount?: number | null
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
  requiresHumanReview: boolean
  requiresRetake: boolean
  reviewReasonCode?: string | null
  responseId: string
  signals?: ExamEvaluationSignalsDto | null
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
      return { label: 'Chờ soát điểm AI', tone: 'warning' }
    case 'RELEASED':
      return { label: 'Đã công bố', tone: 'success' }
    case 'FINAL':
      return { label: 'Chốt điểm', tone: 'success' }
    // Tông phải khớp với RESULT_STATUS_DISPLAY của feature grading — cùng một bài mở ở
    // hai màn hình mà badge đổi màu thì người dùng tưởng là hai trạng thái khác nhau.
    case 'APPEALED':
      return { label: 'Đang khiếu nại', tone: 'info' }
    case 'RE_GRADING':
      return { label: 'Đang chấm lại', tone: 'violet' }
    case 'INVALID':
      return { label: 'Không hợp lệ', tone: 'danger' }
    case 'RETAKE_REQUIRED':
      return { label: 'Cần thi lại', tone: 'danger' }
    case 'PASSED':
      return { label: 'Đạt', tone: 'success' }
    case 'FAILED':
      return { label: 'Không đạt', tone: 'danger' }
    default:
      return { label: status ?? 'Chưa có kết quả', tone: 'neutral' }
  }
}

export function getAttemptStatusDisplay(status?: string | null): { label: string; tone: StatusTone } {
  switch (status) {
    case 'GRADED':
      return { label: 'Đã chấm', tone: 'success' }
    case 'GRADING':
      return { label: 'Đang chấm', tone: 'info' }
    case 'GRADING_FAILED':
      return { label: 'Chấm lỗi', tone: 'danger' }
    case 'SUBMITTED':
      return { label: 'Đã nộp', tone: 'info' }
    case 'IN_PROGRESS':
      return { label: 'Đang làm', tone: 'warning' }
    case 'INTERRUPTED':
      return { label: 'Bị gián đoạn', tone: 'warning' }
    case 'EXPIRED':
      return { label: 'Hết giờ', tone: 'neutral' }
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
