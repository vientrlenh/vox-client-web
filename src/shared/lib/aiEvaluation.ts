import type { StatusTone } from '@/shared/ui/StatusBadge'

/**
 * Cách đọc kết quả chấm của AI, dùng chung cho MỌI màn hình hiển thị nó: trang kết
 * quả của nhà trường, trang kết quả của học sinh, và màn chấm của giáo viên.
 *
 * Đặt ở `shared` chứ không nằm trong một feature vì phần dịch vi phạm quy tắc sang
 * tiếng Việt (`buildValidityRulesForDisplay`) vừa dịch vừa ẨN bớt rule — nhân bản nó
 * là mở đường cho hai màn hình nói hai điều khác nhau về cùng một bài thi.
 */

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

/** Chỉ hai trường này quyết định cách hiển thị vi phạm — nhận cả object evaluation cũng vừa. */
export type AiEvaluationEvidence = {
  signals?: ExamEvaluationSignalsDto | null
  validity?: ExamValidityDto | null
}

export type DisplayValidityRule = ExamValidityRuleResultDto & {
  occurrenceCount: number
}

/** BE trả JSON dạng chuỗi cho signals/validity/wordFeedback — parse hỏng thì coi như không có. */
export function parseJsonField<T>(value: string | null | undefined): T | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function formatConfidencePercent(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-'
  }

  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

/**
 * Màu theo mức đạt, nhận PHẦN TRĂM 0–100 — không phải điểm thô.
 *
 * Ngưỡng 80/45 chỉ có nghĩa trên thang phần trăm. Trước 2026-08-11 điều đó không được nói ra ở
 * đâu cả, và một nửa số chỗ gọi truyền thẳng điểm thô vào: đúng trên rubric thang 0–100 (điểm
 * trùng phần trăm) nhưng sai hẳn trên thang khác — rubric 0–10 thì mọi điểm đều < 45, kể cả bài
 * 10/10 cũng tô đỏ.
 *
 * Quy đổi bằng {@link criterionScorePercentage} trước khi gọi. Hai chỗ chấm theo tiêu chí vốn đã
 * làm đúng như vậy từ đầu; phần còn lại đã được sửa cho khớp.
 */
export function getResultScoreTone(percentage?: number | null): StatusTone {
  if (typeof percentage !== 'number' || Number.isNaN(percentage)) {
    return 'neutral'
  }
  if (percentage > 80) {
    return 'success'
  }
  if (percentage >= 45) {
    return 'warning'
  }
  return 'danger'
}

/**
 * "0–100" -> "100". Mẫu số của thang gần như luôn là số tròn, để nguyên ".00" nhìn như điểm lẻ.
 */
export function formatScaleMax(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null
  }
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)
}

export function criterionScorePercentage(
  value?: number | null,
  minScore?: number | null,
  maxScore?: number | null,
) {
  if (
    typeof value !== 'number'
    || typeof minScore !== 'number'
    || typeof maxScore !== 'number'
    || maxScore <= minScore
  ) {
    return value
  }
  return ((value - minScore) / (maxScore - minScore)) * 100
}

function asFiniteNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

function validitySeverityRank(value?: string | null) {
  return {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }[String(value ?? 'none').toLowerCase()] ?? 0
}

/**
 * Gộp các rule trùng ruleId (giữ mức nghiêm trọng cao nhất, đếm số lượt), dịch thông
 * điệp sang tiếng Việt kèm con số thật, và BỎ HẲN rule đã hết đúng: AI gắn cờ ở mức
 * từng lượt nói, nên một bài đủ dài toàn cục vẫn có thể mang cờ "quá ngắn".
 */
export function buildValidityRulesForDisplay(evaluation: AiEvaluationEvidence): DisplayValidityRule[] {
  const sourceRules = Array.isArray(evaluation.validity?.ruleResults)
    ? evaluation.validity.ruleResults.filter((rule) => rule?.ruleId || rule?.message)
    : []
  const grouped = new Map<string, DisplayValidityRule>()

  sourceRules.forEach((rule) => {
    const key = rule.ruleId || rule.message || 'unknown-rule'
    const existing = grouped.get(key)
    if (!existing) {
      grouped.set(key, { ...rule, occurrenceCount: 1 })
      return
    }

    grouped.set(key, {
      ...(validitySeverityRank(rule.severity) > validitySeverityRank(existing.severity)
        ? rule
        : existing),
      occurrenceCount: existing.occurrenceCount + 1,
    })
  })

  const wordCount = asFiniteNumber(evaluation.signals?.wordCount)
  const expectedMinWords = asFiniteNumber(evaluation.signals?.expectedMinWords)
  const totalDuration = asFiniteNumber(evaluation.signals?.durationSeconds)

  return Array.from(grouped.values()).flatMap((rule) => {
    if (rule.ruleId === 'answer_length.too_short' && wordCount !== null && expectedMinWords !== null) {
      if (wordCount >= expectedMinWords) {
        return []
      }
      return [{
        ...rule,
        message: `Toàn bộ câu trả lời có ${wordCount} từ, mức tối thiểu dự kiến là ${expectedMinWords} từ.`,
      }]
    }

    if (rule.ruleId === 'answer_duration.too_short' && totalDuration !== null) {
      const expectedDuration = asFiniteNumber(rule.evidence?.expectedMinResponseSeconds)
      if (expectedDuration !== null) {
        if (totalDuration >= expectedDuration * 0.5) {
          return []
        }
        return [{
          ...rule,
          message: `Tổng thời gian nói là ${totalDuration} giây, thời gian tối thiểu dự kiến là ${expectedDuration} giây.`,
        }]
      }
    }

    return [rule]
  })
}

export function getReviewReasonLabel(code?: string | null) {
  if (!code) {
    return null
  }

  const labels: Record<string, string> = {
    ALIGNMENT_COVERAGE_LOW: 'Độ phủ alignment thấp',
    ALIGNMENT_MISCUE_HIGH: 'Alignment có nhiều miscue bất thường',
    ALIGNMENT_TIMING_ANOMALY: 'Mốc thời gian alignment bất thường',
    ASR_LOW_CONF: 'ASR chính có độ tin cậy thấp',
    AUDIO_CLIPPING: 'Audio bị clipping nghiêm trọng',
    AUDIO_QUALITY_LOW: 'Chất lượng audio thấp',
    AUDIO_SNR_TOO_LOW: 'Tỷ lệ tín hiệu trên nhiễu quá thấp',
    AUDIO_TOO_MUCH_SILENCE: 'Audio có quá ít lời nói hữu ích',
    CONDUCT_VIOLATION: 'Có vi phạm trong quá trình làm bài',
    LLM_UNSTABLE_DISCOURSE: 'Chấm coherence chưa ổn định',
    LLM_UNSTABLE_COHERENCE: 'Chấm coherence chưa ổn định',
    LLM_UNSTABLE_GRAMMAR: 'Chấm grammar chưa ổn định',
    LLM_UNSTABLE_VOCABULARY: 'Chấm vocabulary chưa ổn định',
    LOW_CONFIDENCE: 'Độ tin cậy AI thấp',
    REFERENCE_DRIFT: 'Reference transcript chưa ổn định',
    VALIDITY_FLAGGED: 'Có cảnh báo validity cần giáo viên xem lại',
  }
  return code.split(',').map((reason) => labels[reason] ?? reason).join(' · ')
}

export function getEvidenceReasonLabel(code: string) {
  switch (code) {
    case 'ANSWER_TOO_SHORT':
      return 'Câu trả lời quá ngắn so với yêu cầu'
    case 'RESPONSE_DURATION_TOO_SHORT':
      return 'Thời lượng trả lời quá ngắn so với yêu cầu'
    case 'TARGET_LANGUAGE_EVIDENCE_TOO_LOW':
      return 'Chưa có đủ nội dung bằng ngôn ngữ mục tiêu'
    case 'SPEECH_EVIDENCE_TOO_LOW':
      return 'Thời lượng lời nói hữu ích quá ít'
    default:
      return code
  }
}

export function getAudioGateLabel(status?: string | null) {
  switch (status) {
    case 'HARD_FAIL':
      return 'Không đạt hard gate'
    case 'SOFT_WARN':
      return 'Chất lượng thấp'
    case 'PASS':
      return 'Đạt'
    default:
      return 'Chưa đủ dữ liệu'
  }
}

export function getAudioGateTone(status?: string | null): StatusTone {
  if (status === 'HARD_FAIL') {
    return 'danger'
  }
  if (status === 'SOFT_WARN') {
    return 'warning'
  }
  return 'neutral'
}

export function getConfidenceModeLabel(mode?: string | null) {
  switch (mode) {
    case 'HIGH_STAKES':
      return 'Profile: High-stakes'
    case 'MOCK_TEST':
      return 'Profile: Mock test'
    case 'PRACTICE':
      return 'Profile: Practice'
    default:
      return null
  }
}

export function getAudioReasonLabel(code: string) {
  return getReviewReasonLabel(code) ?? code
}
