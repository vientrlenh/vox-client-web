import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { GradingTaskItem } from '../types'
import { AiEvaluationSummary } from './AiEvaluationSummary'

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

describe('AiEvaluationSummary', () => {
  it('shows the AI confidence as a percentage', () => {
    const { container } = renderWithProviders(
      <AiEvaluationSummary item={item({ aiOverallConfidence: 0.83 })} />,
    )
    expect(container).toHaveTextContent('Độ tin cậy AI')
    expect(screen.getByText('83%')).toBeInTheDocument()
  })

  it('renders on confidence alone, with no badge and no AI summary', () => {
    // Ca này chính là chỗ guard cũ nuốt mất khối: chỉ có số đo, không có kết luận nào.
    const { container } = renderWithProviders(
      <AiEvaluationSummary item={item({ aiOverallConfidence: 0 })} />,
    )
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(container).not.toBeEmptyDOMElement()
  })

  it('translates the review reason code to Vietnamese', () => {
    renderWithProviders(
      <AiEvaluationSummary
        item={item({
          aiOverallConfidence: 0.4,
          aiRequiresHumanReview: true,
          aiReviewReasonCode: 'LOW_CONFIDENCE',
        })}
      />,
    )
    expect(screen.getByText('AI đề nghị giáo viên duyệt lại')).toBeInTheDocument()
    expect(screen.getByText('Độ tin cậy AI thấp')).toBeInTheDocument()
  })

  it('renders nothing when the paper was never touched by AI', () => {
    const { container } = renderWithProviders(<AiEvaluationSummary item={item()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
