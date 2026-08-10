import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { GradingOutcome, GradingTaskDetail } from '../types'
import { GradingTaskDetailView } from './GradingPages'

function detail(allowedOutcomes: GradingOutcome[], editable: boolean): GradingTaskDetail {
  return {
    allowedOutcomes,
    assignmentId: 'assignment-1',
    assignmentStatus: editable ? 'ASSIGNED' : 'COMPLETED',
    attemptCount: 1,
    attemptNo: 1,
    candidateResultId: 'result-1',
    criteria: [
      { id: 'crit-1', label: 'Phát âm', maxScore: 5, minScore: 1, required: true },
      { id: 'crit-2', label: 'Từ vựng', maxScore: 5, minScore: 1, required: true },
    ],
    editable,
    flagged: false,
    items: [
      {
        aiMarkedInvalid: false,
        aiOverallConfidence: 0.83,
        aiRequiresHumanReview: true,
        aiRequiresRetake: false,
        aiScores: [{ criterionId: 'crit-1', rationale: 'AI: trọng âm lệch.', score: 3 }],
        currentFeedbackSummary: 'Nói trôi chảy, thiếu dẫn chứng.',
        currentItemScore: 4.5,
        currentScores: [
          { criterionId: 'crit-1', score: 4 },
          { criterionId: 'crit-2', score: 5 },
        ],
        orderInSection: 1,
        paperItemId: 'paper-1',
        responseId: 'response-1',
        turns: [],
      },
    ],
    overdue: false,
    resultCode: 'R-001',
    roundType: 'SPOT_CHECK',
    sessionId: null,
  }
}

function renderView(value: GradingTaskDetail) {
  return renderWithProviders(
    <GradingTaskDetailView
      decisionPending={false}
      detail={value}
      invalidatePending={false}
      onBack={jest.fn()}
      onInvalidate={jest.fn()}
      onSubmit={jest.fn()}
      submitPending={false}
      usePreview={() => ({ data: undefined, isFetching: false })}
    />,
  )
}

describe('GradingTaskDetailView', () => {
  it('keeps the criterion breakdown and grader comment once the assignment is closed', () => {
    // Hồi quy: cột nhập điểm nằm sau `canRegrade`, nên phân công đóng là mất sạch điểm tiêu chí,
    // nhận xét từng tiêu chí của AI và nhận xét của người chấm.
    renderView(detail([], false))

    expect(screen.getByText('Điểm từng tiêu chí · Phần 1')).toBeInTheDocument()
    expect(screen.getByText('Phát âm')).toBeInTheDocument()
    expect(screen.getByText('Từ vựng')).toBeInTheDocument()
    expect(screen.getByText('4.0 điểm · thang 1.0–5.0')).toBeInTheDocument()
    expect(screen.getByText('AI: trọng âm lệch.')).toBeInTheDocument()
    expect(screen.getByText('Nói trôi chảy, thiếu dẫn chứng.')).toBeInTheDocument()
    expect(screen.getByText('Phân công đã đóng — không thao tác được nữa')).toBeInTheDocument()
  })

  it('shows the AI confidence in both states', () => {
    const closed = renderView(detail([], false))
    expect(screen.getByText('83%')).toBeInTheDocument()
    closed.unmount()

    renderView(detail(['REGRADED'], true))
    expect(screen.getByText('83%')).toBeInTheDocument()
  })

  it('still uses score inputs, not the read-only block, while the round allows regrading', () => {
    renderView(detail(['REGRADED'], true))

    expect(screen.getByLabelText('Điểm tiêu chí Phát âm')).toBeInTheDocument()
    expect(screen.queryByText('Điểm từng tiêu chí · Phần 1')).not.toBeInTheDocument()
  })

  it('opens the score timeline, including once the assignment is closed', async () => {
    // "Điểm này đã đi qua những tay nào" là câu hỏi của vòng phúc khảo, mà lúc đó phân
    // công vòng trước đã đóng — nút phải còn ở cả hai trạng thái.
    renderView(detail([], false))

    await userEvent.click(screen.getByRole('button', { name: 'Lịch sử điểm' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lịch sử điểm' })).toBeInTheDocument()
    expect(screen.getByText('#R-001')).toBeInTheDocument()
  })
})
