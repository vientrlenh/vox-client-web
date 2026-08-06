import {
  clampToCriterion,
  countSections,
  describeReclaimResult,
  formatAttemptLabel,
  formatScore,
  formatScoreDelta,
  getResultStatusDisplay,
  getRoundTypeDisplay,
  isEveryRequiredCriterionFilled,
  itemLabel,
  localDateTimeToIso,
  stepForCriterion,
  suggestedRoundFor,
  type GradingCriterionMeta,
  type GradingTaskDetail,
  type GradingTaskItem,
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

function item(overrides: Partial<GradingTaskItem> = {}): GradingTaskItem {
  return {
    aiMarkedInvalid: false,
    aiRequiresHumanReview: false,
    aiRequiresRetake: false,
    aiScores: [],
    currentScores: [],
    orderInSection: 1,
    paperItemId: 'p1',
    responseId: 'r1',
    turns: [],
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
      attemptCount: 1,
      attemptNo: 1,
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
        item({ paperItemId: 'p1', responseId: 'r1' }),
        item({ paperItemId: 'p2', responseId: 'r2' }),
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

  describe('itemLabel', () => {
    it('đánh số câu khi một phần thi có nhiều câu', () => {
      // Chính là ca gây bug: hai câu cùng Part 1 từng hiện hai tab đều tên "Part 1".
      const items = [
        item({ orderInSection: 1, paperItemId: 'p1', partLabel: 'Part 1', sectionId: 's1' }),
        item({ orderInSection: 2, paperItemId: 'p2', partLabel: 'Part 1', sectionId: 's1' }),
        item({ orderInSection: 1, paperItemId: 'p3', partLabel: 'Part 2', sectionId: 's2' }),
      ]

      expect(items.map((one) => itemLabel(one, items))).toEqual([
        'Part 1 · Câu 1',
        'Part 1 · Câu 2',
        'Part 2',
      ])
    })

    it('không gộp hai phần thi trùng tiêu đề', () => {
      // Gộp theo tên sẽ đánh số xuyên qua ranh giới phần; phải gộp theo sectionId.
      const items = [
        item({ orderInSection: 1, paperItemId: 'p1', partLabel: 'Part 1', sectionId: 's1' }),
        item({ orderInSection: 1, paperItemId: 'p2', partLabel: 'Part 1', sectionId: 's2' }),
      ]

      expect(items.map((one) => itemLabel(one, items))).toEqual(['Part 1', 'Part 1'])
    })

    it('lùi về "Phần N" khi bài không có tiêu đề section', () => {
      const items = [
        item({ paperItemId: 'p1', partLabel: null }),
        item({ paperItemId: 'p2', partLabel: null }),
      ]

      expect(items.map((one) => itemLabel(one, items))).toEqual(['Phần 1', 'Phần 2'])
    })
  })

  describe('countSections', () => {
    it('đếm phần thi chứ không đếm câu', () => {
      expect(
        countSections([
          item({ paperItemId: 'p1', sectionId: 's1' }),
          item({ paperItemId: 'p2', sectionId: 's1' }),
          item({ paperItemId: 'p3', sectionId: 's2' }),
        ]),
      ).toBe(2)
    })
  })

  describe('formatScore', () => {
    it('formats whole numbers with one decimal and drops trailing zeroes', () => {
      expect(formatScore(6)).toBe('6.0')
      expect(formatScore(6.75)).toBe('6.75')
      expect(formatScore(null)).toBe('—')
    })
  })

  describe('formatAttemptLabel', () => {
    it('names which attempt a row belongs to when the student retook the exam', () => {
      expect(formatAttemptLabel(2, 2)).toBe('Lượt 2/2')
      expect(formatAttemptLabel(1, 3)).toBe('Lượt 1/3')
    })

    /** Gắn "Lượt 1/1" lên mọi dòng là thêm nhiễu vào đúng chỗ cần nhìn nhanh. */
    it('is null for a single attempt or when the count is missing', () => {
      expect(formatAttemptLabel(1, 1)).toBeNull()
      expect(formatAttemptLabel(1, null)).toBeNull()
      expect(formatAttemptLabel(null, 2)).toBeNull()
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

  describe('describeReclaimResult', () => {
    it('reports the reclaimed count — không phải câu "không có gì để thu hồi"', () => {
      // Hồi quy: FE từng đọc response như một mảng nên `.length` là undefined và mọi
      // lượt thu hồi thành công đều báo là không có gì.
      const message = describeReclaimResult({
        hasMore: false,
        reassignedAssignmentIds: [],
        reclaimedAssignmentIds: ['a1', 'a2'],
      })
      expect(message).toContain('2 phân công quá hạn')
      expect(message).toContain('hàng chưa giao')
    })

    it('separates reclaimed from reassigned', () => {
      const message = describeReclaimResult({
        hasMore: false,
        reassignedAssignmentIds: ['a9'],
        reclaimedAssignmentIds: ['a1', 'a2'],
      })
      expect(message).toContain('thu hồi 2')
      expect(message).toContain('giao lại 1')
    })

    it('tells the admin to run again when the batch was capped', () => {
      const message = describeReclaimResult({
        hasMore: true,
        reassignedAssignmentIds: [],
        reclaimedAssignmentIds: ['a1'],
      })
      expect(message).toContain('bấm thu hồi lần nữa')
    })

    it('falls back to the empty message only when nothing was reclaimed', () => {
      expect(
        describeReclaimResult({
          hasMore: false,
          reassignedAssignmentIds: [],
          reclaimedAssignmentIds: [],
        }),
      ).toBe('Không có phân công quá hạn nào để thu hồi.')
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
