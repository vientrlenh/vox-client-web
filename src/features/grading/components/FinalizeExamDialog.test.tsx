import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { BulkFinalizePreview } from '../types'
import { FinalizeExamDialog } from './FinalizeExamDialog'

function preview(overrides: Partial<BulkFinalizePreview> = {}): BulkFinalizePreview {
  return {
    blockingResultIds: [],
    invalid: 0,
    openAppeals: 0,
    pendingAssigned: 0,
    pendingUnassigned: 0,
    readyToFinalize: 10,
    total: 10,
    ...overrides,
  }
}

function renderDialog(value: BulkFinalizePreview) {
  renderWithProviders(
    <FinalizeExamDialog onCancel={jest.fn()} onConfirm={jest.fn()} preview={value} />,
  )
  return screen.getByRole('button', { name: 'Chốt sổ kỳ thi' })
}

describe('FinalizeExamDialog', () => {
  it('enables confirm when nothing is pending', () => {
    expect(renderDialog(preview())).toBeEnabled()
  })

  it('offers the AI-score checkbox for papers still being graded', () => {
    const confirm = renderDialog(preview({ pendingUnassigned: 3, readyToFinalize: 7 }))
    // Bài chờ chấm là loại "dở" mà admin bỏ qua được — bằng cách xác nhận điểm AI.
    expect(confirm).toBeDisabled()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('hard-blocks on open appeals without offering any bypass', () => {
    // BE từ chối vô điều kiện khi còn đơn phúc khảo: `releasePendingWithAiScores`
    // KHÔNG bỏ qua được. Dựng checkbox ở đây là hứa một điều nút không làm được.
    const confirm = renderDialog(preview({ openAppeals: 2, pendingUnassigned: 3 }))
    expect(confirm).toBeDisabled()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByText(/2 đơn phúc khảo chưa xong/)).toBeInTheDocument()
  })

  it('says invalid papers are settled when results are published, not now', () => {
    renderDialog(preview({ invalid: 4 }))
    expect(screen.getByText(/khi kỳ thi công bố kết quả/)).toBeInTheDocument()
  })
})
