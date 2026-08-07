import { getHiddenResultNotice, resolveEvaluationDisplay, type ExamItemEvaluationDto } from './types'

/**
 * Sau khi giáo viên chấm lại, bản đang hiệu lực là bản HUMAN — mọi cột AI của nó đều rỗng.
 * `resolveEvaluationDisplay` là chỗ DUY NHẤT quyết định lấy con số nào từ bản nào, nên
 * ranh giới đó được khoá ở đây thay vì rải ra từng component.
 */
function evaluation(overrides: Partial<ExamItemEvaluationDto> = {}): ExamItemEvaluationDto {
  return {
    ai: null,
    criteria: [],
    engineType: 'AI_SINGLE',
    evaluatedAt: '2026-08-01T02:00:00Z',
    feedbackSummary: 'AI: phát âm ổn',
    id: 'eval-1',
    itemScore: 6,
    markedInvalid: false,
    overallConfidence: 0.82,
    paperItemId: 'item-1',
    rawItemScore: 6,
    requiresHumanReview: false,
    requiresRetake: false,
    responseId: 'response-1',
    signals: { audioQuality: 0.9 },
    status: 'AUTO_GRADED',
    turns: [],
    validity: { validForScoring: true },
    ...overrides,
  }
}

const aiContext: NonNullable<ExamItemEvaluationDto['ai']> = {
  engineType: 'AI_SINGLE',
  evaluatedAt: '2026-08-01T02:00:00Z',
  evaluationId: 'eval-ai',
  feedbackSummary: 'AI: phát âm ổn',
  gradedByModel: 'gpt-x',
  markedInvalid: false,
  overallConfidence: 0.82,
  requiresHumanReview: true,
  requiresRetake: false,
  reviewReasonCode: 'LOW_CONFIDENCE',
  signals: { audioQuality: 0.9 },
  suggestions: ['nói chậm lại'],
  validity: { validForScoring: true },
}

describe('resolveEvaluationDisplay', () => {
  it('lấy bằng chứng từ khối ai khi bản hiệu lực là bản chấm tay', () => {
    const display = resolveEvaluationDisplay(evaluation({
      ai: aiContext,
      engineType: 'HUMAN',
      feedbackSummary: 'GV: đạt yêu cầu',
      overallConfidence: null,
      requiresHumanReview: false,
      signals: null,
      validity: null,
    }))

    expect(display.humanGraded).toBe(true)
    expect(display.overallConfidence).toBe(0.82)
    expect(display.signals).toEqual({ audioQuality: 0.9 })
    expect(display.validity).toEqual({ validForScoring: true })
    expect(display.requiresHumanReview).toBe(true)
    expect(display.reviewReasonCode).toBe('LOW_CONFIDENCE')
  })

  it('tách nhận xét của AI khỏi nhận xét của giáo viên', () => {
    const display = resolveEvaluationDisplay(evaluation({
      ai: aiContext,
      engineType: 'HUMAN',
      feedbackSummary: 'GV: đạt yêu cầu',
    }))

    // Hai người khác nhau nói về cùng một bài — gộp lại là mất dấu ai nói gì.
    expect(display.aiFeedbackSummary).toBe('AI: phát âm ổn')
    expect(display.aiEvaluatedAt).toBe('2026-08-01T02:00:00Z')
  })

  it('không dựng khối AI riêng khi chưa ai chấm lại', () => {
    const display = resolveEvaluationDisplay(evaluation({ ai: aiContext }))

    // Bản hiệu lực chính là bản AI: hiển thị thêm một khối "AI tham khảo" nữa là lặp.
    expect(display.humanGraded).toBe(false)
    expect(display.aiFeedbackSummary).toBeNull()
    expect(display.aiEvaluatedAt).toBeNull()
    expect(display.overallConfidence).toBe(0.82)
  })

  it('giữ nguyên hành vi cũ khi không có khối ai', () => {
    const display = resolveEvaluationDisplay(evaluation())

    expect(display.overallConfidence).toBe(0.82)
    expect(display.signals).toEqual({ audioQuality: 0.9 })
    expect(display.aiFeedbackSummary).toBeNull()
  })

  it('gộp cờ cảnh báo từ cả hai bản', () => {
    const display = resolveEvaluationDisplay(evaluation({
      ai: { ...aiContext, markedInvalid: true, requiresRetake: true },
      engineType: 'HUMAN',
      markedInvalid: false,
      requiresRetake: false,
    }))

    expect(display.markedInvalid).toBe(true)
    expect(display.requiresRetake).toBe(true)
  })
})

describe('getHiddenResultNotice', () => {
  it('nói rõ bài đang chờ công bố khi PENDING_REVIEW', () => {
    expect(getHiddenResultNotice('PENDING_REVIEW').title).toBe('Kết quả đang chờ công bố')
  })

  it('phân biệt phúc khảo với chờ chấm', () => {
    // Nói "chờ giáo viên xem xét" cho một bài đang phúc khảo là sai sự thật.
    expect(getHiddenResultNotice('APPEALED').title).toBe('Đang xử lý phúc khảo')
    expect(getHiddenResultNotice('RE_GRADING').title).toBe('Đang chấm lại')
  })

  it('báo cần làm lại bài khi RETAKE_REQUIRED', () => {
    const notice = getHiddenResultNotice('RETAKE_REQUIRED')

    expect(notice.title).toBe('Cần làm lại bài')
    expect(notice.tone).toBe('danger')
  })

  it('có nội dung dự phòng cho trạng thái lạ', () => {
    expect(getHiddenResultNotice(null).title).toBe('Chưa có kết quả')
    expect(getHiddenResultNotice('SOMETHING_NEW').tone).toBe('info')
  })
})
