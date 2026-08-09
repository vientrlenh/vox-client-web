import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { GradingCriterionMeta, GradingTaskItem } from '../types'
import { GradedCriteriaSummary } from './GradedCriteriaSummary'

function criterion(overrides: Partial<GradingCriterionMeta> = {}): GradingCriterionMeta {
  return {
    id: 'crit-1',
    label: 'Phát âm',
    maxScore: 5,
    minScore: 1,
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
    paperItemId: 'paper-1',
    responseId: 'response-1',
    turns: [],
    ...overrides,
  }
}

describe('GradedCriteriaSummary', () => {
  it('lists every criterion, including ones nobody scored', () => {
    renderWithProviders(
      <GradedCriteriaSummary
        criteria={[criterion(), criterion({ id: 'crit-2', label: 'Từ vựng' })]}
        item={item({ currentScores: [{ criterionId: 'crit-1', score: 4 }] })}
      />,
    )
    expect(screen.getByText('Phát âm')).toBeInTheDocument()
    expect(screen.getByText('Từ vựng')).toBeInTheDocument()
    expect(screen.getByText('Chưa chấm')).toBeInTheDocument()
  })

  it('shows the real rubric scale, not a hardcoded 0–9 band', () => {
    renderWithProviders(
      <GradedCriteriaSummary
        criteria={[criterion({ maxScore: 5, minScore: 1 })]}
        item={item({ currentScores: [{ criterionId: 'crit-1', score: 4 }] })}
      />,
    )
    expect(screen.getByText('4.0 điểm · thang 1.0–5.0')).toBeInTheDocument()
  })

  it('shows the grader comment for the paper', () => {
    renderWithProviders(
      <GradedCriteriaSummary
        criteria={[criterion()]}
        item={item({ currentFeedbackSummary: 'Nói trôi chảy, thiếu dẫn chứng.' })}
      />,
    )
    expect(screen.getByText('Nói trôi chảy, thiếu dẫn chứng.')).toBeInTheDocument()
  })

  it('does not print the same rationale twice when AI and the grader agree', () => {
    renderWithProviders(
      <GradedCriteriaSummary
        criteria={[criterion()]}
        item={item({
          aiScores: [{ criterionId: 'crit-1', rationale: 'Trọng âm chưa chuẩn.', score: 4 }],
          currentScores: [{ criterionId: 'crit-1', rationale: 'Trọng âm chưa chuẩn.', score: 4 }],
        })}
      />,
    )
    expect(screen.getAllByText('Trọng âm chưa chuẩn.')).toHaveLength(1)
    expect(screen.queryByText('Nhận xét của AI')).not.toBeInTheDocument()
  })

  it('keeps the AI rationale separate when it differs from the grader', () => {
    renderWithProviders(
      <GradedCriteriaSummary
        criteria={[criterion()]}
        item={item({
          aiScores: [{ criterionId: 'crit-1', rationale: 'AI: trọng âm lệch.', score: 3 }],
          currentScores: [{ criterionId: 'crit-1', rationale: 'Nghe lại thấy ổn.', score: 4 }],
        })}
      />,
    )
    expect(screen.getByText('Nghe lại thấy ổn.')).toBeInTheDocument()
    expect(screen.getByText('AI: trọng âm lệch.')).toBeInTheDocument()
    // Điểm AI khác điểm đang có hiệu lực thì phải nói ra để đối chiếu được.
    expect(screen.getByText('AI chấm 3.0')).toBeInTheDocument()
  })
})
