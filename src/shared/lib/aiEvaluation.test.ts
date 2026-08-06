import { buildValidityRulesForDisplay, formatConfidencePercent } from './aiEvaluation'

describe('buildValidityRulesForDisplay', () => {
  it('gộp rule trùng ruleId, giữ mức nghiêm trọng cao nhất và đếm số lượt', () => {
    const rules = buildValidityRulesForDisplay({
      validity: {
        ruleResults: [
          { ruleId: 'off_topic', severity: 'low', action: 'flag' },
          { ruleId: 'off_topic', severity: 'high', action: 'score_with_penalty' },
        ],
      },
    })

    expect(rules).toHaveLength(1)
    expect(rules[0].severity).toBe('high')
    expect(rules[0].action).toBe('score_with_penalty')
    expect(rules[0].occurrenceCount).toBe(2)
  })

  it('dịch answer_length.too_short kèm số từ thật', () => {
    const rules = buildValidityRulesForDisplay({
      signals: { expectedMinWords: 112, wordCount: 109 },
      validity: { ruleResults: [{ ruleId: 'answer_length.too_short', severity: 'medium' }] },
    })

    expect(rules[0].message).toBe(
      'Toàn bộ câu trả lời có 109 từ, mức tối thiểu dự kiến là 112 từ.',
    )
  })

  it('ẩn hẳn rule quá ngắn khi cả bài đã đủ dài', () => {
    // AI gắn cờ ở mức từng lượt nói; cộng lại cả bài có thể đã vượt ngưỡng. Hiện cờ
    // lúc đó là báo cho giáo viên một vi phạm không còn tồn tại.
    const rules = buildValidityRulesForDisplay({
      signals: { expectedMinWords: 100, wordCount: 140 },
      validity: { ruleResults: [{ ruleId: 'answer_length.too_short', severity: 'medium' }] },
    })

    expect(rules).toHaveLength(0)
  })

  it('ẩn rule quá ngắn về thời lượng khi đã nói quá nửa thời gian kỳ vọng', () => {
    const rules = buildValidityRulesForDisplay({
      signals: { durationSeconds: 40 },
      validity: {
        ruleResults: [
          {
            evidence: { expectedMinResponseSeconds: 60 },
            ruleId: 'answer_duration.too_short',
            severity: 'medium',
          },
        ],
      },
    })

    expect(rules).toHaveLength(0)
  })

  it('không có validity thì không có vi phạm nào', () => {
    expect(buildValidityRulesForDisplay({})).toEqual([])
    expect(buildValidityRulesForDisplay({ validity: null })).toEqual([])
  })
})

describe('formatConfidencePercent', () => {
  it('đổi tỉ lệ 0–1 thành phần trăm và kẹp vào biên', () => {
    expect(formatConfidencePercent(0.42)).toBe('42%')
    expect(formatConfidencePercent(1.4)).toBe('100%')
    expect(formatConfidencePercent(null)).toBe('-')
  })
})
