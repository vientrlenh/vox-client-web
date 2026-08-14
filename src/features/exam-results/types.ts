import type { ExamEvaluationSignalsDto, ExamValidityDto } from '@/shared/lib/aiEvaluation'
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

export type StudentExamKind = 'CENTRALIZED' | 'CLASS_TEST'

/** Đúng bộ giá trị mà BE suy ra cho `status` của mỗi bài thi — dùng luôn làm bộ lọc. */
export type StudentExamStatusFilter = 'completed' | 'in_progress' | 'upcoming'

export type StudentExamPage = {
  content: StudentExamSummaryDto[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type ExamResultSectionDto = {
  score: number
  sectionId: string
  title?: string | null
}

export type ExamResultItemDto = {
  itemScore: number
  paperItemId: string
  /**
   * Đề bài, do BE trả thẳng từ bảng questions. Đừng quay lại cách cũ là suy ra từ
   * `turns[].promptText`: turn đầu tiên là lời dẫn của AI ("You have 10 seconds to prepare…"),
   * không phải đề bài, và nó chỉ được nạp khi người dùng mở thẻ ra.
   */
  questionText?: string | null
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
  scoringScaleMax?: number | null
  scoringScaleMin?: number | null
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
  maxScore?: number | null
  minScore?: number | null
  rationale?: string | null
  rawScore: number
  rubricCriterionId: string
}

// Cách đọc kết quả AI dùng chung với màn chấm của giáo viên — xem `@/shared/lib/aiEvaluation`.
export type {
  ExamEvaluationSignalsDto,
  ExamValidityDto,
  ExamValidityRuleResultDto,
} from '@/shared/lib/aiEvaluation'

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

/**
 * Bằng chứng của bản chấm AI, giữ lại kể cả khi giáo viên đã chấm lại. Điểm và rationale
 * hiển thị vẫn là của bản đang hiệu lực ở cấp trên — khối này chỉ là ngữ cảnh.
 */
export type ExamItemAiEvaluationContextDto = {
  engineType?: string | null
  evaluatedAt?: string | null
  evaluationId: string
  feedbackSummary?: string | null
  gradedByModel?: string | null
  markedInvalid: boolean
  overallConfidence?: number | null
  promptVersion?: string | null
  requiresHumanReview: boolean
  requiresRetake: boolean
  reviewReasonCode?: string | null
  signals?: ExamEvaluationSignalsDto | null
  suggestions?: unknown
  validity?: ExamValidityDto | null
}

export type ExamItemEvaluationDto = {
  /** Ngữ cảnh AI; `null` khi bài chưa từng có bản AI. */
  ai?: ExamItemAiEvaluationContextDto | null
  criteria: ExamItemCriterionScoreDto[]
  engineType?: string | null
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
  /** Luôn đến từ bản AI — bản chấm tay không sinh lượt nói nào. */
  turns: ExamItemEvaluationTurnDto[]
  validity?: ExamValidityDto | null
}

/**
 * Sau khi giáo viên chấm lại, bản hiệu lực là bản HUMAN: điểm và rationale là của giáo
 * viên, còn phân tích của AI nằm ở khối `ai`. Gộp ở đúng một chỗ để màn học sinh và màn
 * giáo viên không lệch nhau — và để mọi chỗ hiển thị biết con số đến từ bản nào.
 */
export function resolveEvaluationDisplay(evaluation: ExamItemEvaluationDto) {
  const ai = evaluation.ai ?? null
  const humanGraded = evaluation.engineType === 'HUMAN'
  return {
    aiEvaluatedAt: humanGraded ? ai?.evaluatedAt ?? null : null,
    aiFeedbackSummary: humanGraded ? ai?.feedbackSummary ?? null : null,
    humanGraded,
    markedInvalid: evaluation.markedInvalid || Boolean(ai?.markedInvalid),
    overallConfidence: evaluation.overallConfidence ?? ai?.overallConfidence ?? null,
    requiresHumanReview: evaluation.requiresHumanReview || Boolean(ai?.requiresHumanReview),
    requiresRetake: evaluation.requiresRetake || Boolean(ai?.requiresRetake),
    reviewReasonCode: evaluation.reviewReasonCode ?? ai?.reviewReasonCode ?? null,
    signals: evaluation.signals ?? ai?.signals ?? null,
    suggestions: evaluation.suggestions ?? ai?.suggestions ?? null,
    validity: evaluation.validity ?? ai?.validity ?? null,
  }
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

/**
 * Nội dung tấm chắn khi BE trả `scoreVisible: false`. Học sinh chỉ xem được bài đã có
 * kết luận (RELEASED/FINAL/PASSED/FAILED/INVALID), nên bốn trạng thái còn lại cần lời
 * giải thích khác nhau — nói "chờ giáo viên xem xét" cho một bài đang phúc khảo là sai.
 *
 * `ResultStatePanel` chỉ nhận ba tông danger/info/warning.
 */
export function getHiddenResultNotice(
  status?: string | null,
): { description: string; title: string; tone: 'danger' | 'info' | 'warning' } {
  switch (status) {
    case 'PENDING_REVIEW':
      return {
        description: 'Giáo viên đang soát lại bài của bạn. Điểm sẽ hiện ngay khi được công bố.',
        title: 'Kết quả đang chờ công bố',
        tone: 'warning',
      }
    case 'APPEALED':
      return {
        description: 'Đơn phúc khảo của bạn đang được xử lý. Kết quả sẽ cập nhật sau khi có quyết định.',
        title: 'Đang xử lý phúc khảo',
        tone: 'info',
      }
    case 'RE_GRADING':
      return {
        description: 'Bài của bạn đang được chấm lại. Vui lòng quay lại sau.',
        title: 'Đang chấm lại',
        tone: 'warning',
      }
    case 'RETAKE_REQUIRED':
      return {
        description: 'Bạn cần làm lại bài này. Vui lòng liên hệ giáo viên để được sắp lịch.',
        title: 'Cần làm lại bài',
        tone: 'danger',
      }
    default:
      return {
        description: 'Kết quả bài làm của bạn hiện chưa sẵn sàng để xem.',
        title: 'Chưa có kết quả',
        tone: 'info',
      }
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
