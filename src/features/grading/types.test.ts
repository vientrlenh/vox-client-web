import {
  clampToCriterion,
  formatScore,
  formatScoreDelta,
  getResultStatusDisplay,
  getRoundTypeDisplay,
  isEveryRequiredCriterionFilled,
  localDateTimeToIso,
  stepForCriterion,
  suggestedRoundFor,
  type GradingCriterionMeta,
  type GradingTaskDetail,
} from './types'

function criterion(overrides: Partial<GradingCriterionMeta> = {}): GradingCriterionMeta {
  return {
    id: 'c1',
    maxScore: 9,
    minScore: 0,
    required: true,
    ...overrides,
  }
}

describe('grading helpers', () => {
  describe('clampToCriterion', () => {
    it('keeps a value inside the rubric range', () => {
      expect(clampToCriterion(criterion({ maxScore: 9, minScore: 0 }), 5)).toBe(5)
    })

    it('clamps above the max and below the min', () => {
      const c = criterion({ maxScore: 9, minScore: 2 })
      expect(clampToCriterion(c, 12)).toBe(9)
      expect(clampToCriterion(c, 1)).toBe(2)
    })
  })

  describe('stepForCriterion', () => {
    it('uses a 0.5 step for wide band scales', () => {
      expect(stepForCriterion(criterion({ maxScore: 9, minScore: 0 }))).toBe(0.5)
    })

    it('uses a finer step for narrow scales', () => {
      expect(stepForCriterion(criterion({ maxScore: 3, minScore: 0 }))).toBe(0.25)
    })
  })

  describe('isEveryRequiredCriterionFilled', () => {
    const detail: GradingTaskDetail = {
      allowedOutcomes: ['UPHELD', 'REGRADED', 'INVALIDATED'],
      assignmentId: 'a1',
      assignmentStatus: 'ASSIGNED',
      candidateResultId: 'cr1',
      criteria: [
        criterion({ id: 'c1', required: true }),
        criterion({ id: 'c2', required: false }),
      ],
      currentTotalScore: null,
      editable: true,
      examName: 'IELTS',
      flagReason: null,
      flagged: false,
      items: [
        { currentScores: [], paperItemId: 'p1', responseId: 'r1', turns: [] },
        { currentScores: [], paperItemId: 'p2', responseId: 'r2', turns: [] },
      ],
      overdue: false,
      resultCode: 'A2041F3C',
      resultStatus: 'PENDING_REVIEW',
      roundType: 'INITIAL',
    }

    it('is false until every required criterion of every part is filled', () => {
      expect(
        isEveryRequiredCriterionFilled(detail, { p1: { c1: 8 }, p2: { c1: null } }),
      ).toBe(false)
    })

    it('ignores optional criteria', () => {
      // c2 không bắt buộc — thiếu vẫn cho nộp.
      expect(
        isEveryRequiredCriterionFilled(detail, { p1: { c1: 8 }, p2: { c1: 6 } }),
      ).toBe(true)
    })

    it('is false when there are no parts to grade', () => {
      // Bài không có phần thi nào: `[].every()` trả true nên phải chặn tường minh,
      // nếu không nút Nộp sẽ bật và gửi items rỗng.
      expect(isEveryRequiredCriterionFilled({ ...detail, items: [] }, {})).toBe(false)
    })
  })

  describe('formatScore', () => {
    it('formats whole numbers with one decimal and drops trailing zeroes', () => {
      expect(formatScore(6)).toBe('6.0')
      expect(formatScore(6.75)).toBe('6.75')
      expect(formatScore(null)).toBe('—')
    })
  })

  describe('formatScoreDelta', () => {
    it('signs the difference and names the no-change case', () => {
      expect(formatScoreDelta(6, 7)).toBe('+1.0')
      expect(formatScoreDelta(7, 6.5)).toBe('−0.5')
      expect(formatScoreDelta(7, 7)).toBe('không đổi')
    })

    it('is null when either end is missing', () => {
      expect(formatScoreDelta(null, 7)).toBeNull()
      expect(formatScoreDelta(7, null)).toBeNull()
    })
  })

  describe('getResultStatusDisplay', () => {
    it('maps known statuses and falls back for unknown ones', () => {
      expect(getResultStatusDisplay('PENDING_REVIEW').label).toBe('Chờ soát điểm AI')
      expect(getResultStatusDisplay('INVALID').tone).toBe('danger')
      expect(getResultStatusDisplay(null).label).toBe('—')
    })
  })

  describe('getRoundTypeDisplay', () => {
    it('labels every round and degrades gracefully when there is no open round', () => {
      expect(getRoundTypeDisplay('SPOT_CHECK').label).toBe('Hậu kiểm')
      expect(getRoundTypeDisplay('APPEAL').label).toBe('Phúc khảo')
      expect(getRoundTypeDisplay(null).label).toBe('—')
    })
  })

  describe('suggestedRoundFor', () => {
    it('mirrors the assignable statuses of each round', () => {
      expect(suggestedRoundFor('PENDING_REVIEW')).toBe('INITIAL')
      expect(suggestedRoundFor('RELEASED')).toBe('SPOT_CHECK')
      expect(suggestedRoundFor('INVALID')).toBe('REMEDIATION')
      expect(suggestedRoundFor('APPEALED')).toBe('APPEAL')
      expect(suggestedRoundFor('RE_GRADING')).toBe('APPEAL')
    })

    it('has no suggestion for statuses no round accepts', () => {
      // Bài đã chốt sổ không nhận vòng chấm nào nữa.
      expect(suggestedRoundFor('FINAL')).toBeNull()
      expect(suggestedRoundFor(null)).toBeNull()
    })
  })

  describe('localDateTimeToIso', () => {
    it('turns an empty input into null — nghĩa là gỡ hạn', () => {
      expect(localDateTimeToIso('')).toBeNull()
    })

    it('produces an ISO instant the backend can parse as OffsetDateTime', () => {
      const iso = localDateTimeToIso('2026-08-01T09:30')
      expect(iso).not.toBeNull()
      expect(new Date(iso as string).toISOString()).toBe(iso)
    })
  })
})
