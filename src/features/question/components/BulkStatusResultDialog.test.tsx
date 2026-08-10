import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { groupBulkFailures } from '../bulkStatus'
import type { BulkUpdateQuestionStatusFailure } from '../types'
import { BulkStatusResultDialog } from './BulkStatusResultDialog'

const INVALID_STATUS_REASON =
  'Không thể duyệt: câu hỏi đang ở trạng thái "Đã duyệt", thao tác này chỉ áp dụng cho câu hỏi ở trạng thái "Chờ duyệt"'

function failure(
  overrides: Partial<BulkUpdateQuestionStatusFailure> = {},
): BulkUpdateQuestionStatusFailure {
  return {
    currentStatus: 'APPROVED',
    questionCode: 'Q-IMPORT-020',
    questionId: 'question-20',
    reason: INVALID_STATUS_REASON,
    reasonCode: 'INVALID_STATUS',
    ...overrides,
  }
}

describe('groupBulkFailures', () => {
  it('gộp các câu cùng lý do thành một nhóm thay vì liệt kê từng câu', () => {
    const groups = groupBulkFailures([
      failure(),
      failure({ questionCode: 'Q-IMPORT-019', questionId: 'question-19' }),
      failure({ questionCode: 'Q-IMPORT-018', questionId: 'question-18' }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(3)
    expect(groups[0].reason).toBe(INVALID_STATUS_REASON)
  })

  it('tách nhóm khi lý do khác nhau và giữ thứ tự backend trả về', () => {
    const groups = groupBulkFailures([
      failure(),
      failure({
        questionCode: 'Q-IMPORT-011',
        questionId: 'question-11',
        reason: 'Không thể duyệt: bạn là người tạo câu hỏi này, cần người khác duyệt',
        reasonCode: 'SELF_REVIEW',
      }),
      failure({ questionCode: 'Q-IMPORT-010', questionId: 'question-10' }),
    ])

    expect(groups.map((group) => group.items.length)).toEqual([2, 1])
    expect(groups[1].reason).toContain('cần người khác duyệt')
  })
})

describe('BulkStatusResultDialog', () => {
  it('không hiện gì khi chưa có kết quả', () => {
    const { container } = render(<BulkStatusResultDialog onClose={jest.fn()} result={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('nói rõ đã xử lý bao nhiêu, bỏ qua bao nhiêu và vì sao', () => {
    render(
      <BulkStatusResultDialog
        onClose={jest.fn()}
        result={{
          actionVerb: 'duyệt',
          failed: [failure(), failure({ questionCode: 'Q-IMPORT-019', questionId: 'question-19' })],
          totalCount: 3,
          updatedCount: 1,
        }}
      />,
    )

    expect(
      screen.getByText('Đã duyệt 1/3 câu hỏi. 2 câu bị bỏ qua và giữ nguyên trạng thái.'),
    ).toBeInTheDocument()
    expect(screen.getByText(INVALID_STATUS_REASON)).toBeInTheDocument()
    expect(screen.getByText('2 câu')).toBeInTheDocument()
    expect(screen.getByText('Q-IMPORT-020')).toBeInTheDocument()
    expect(screen.getByText('Q-IMPORT-019')).toBeInTheDocument()
  })

  it('kèm gợi ý xử lý cho từng loại lý do', () => {
    render(
      <BulkStatusResultDialog
        onClose={jest.fn()}
        result={{
          actionVerb: 'duyệt',
          failed: [
            failure({
              reason: 'Không thể duyệt: bạn là người tạo câu hỏi này, cần người khác duyệt',
              reasonCode: 'SELF_REVIEW',
            }),
          ],
          totalCount: 1,
          updatedCount: 0,
        }}
      />,
    )

    expect(
      screen.getByText(
        'Nhờ quản trị viên hoặc người cộng tác khác duyệt giúp những câu bạn tự tạo.',
      ),
    ).toBeInTheDocument()
  })

  /** Điểm chính của thay đổi: kết quả không được tự biến mất như toast cũ. */
  it('chỉ đóng khi người dùng bấm đóng', async () => {
    const onClose = jest.fn()
    render(
      <BulkStatusResultDialog
        onClose={onClose}
        result={{ actionVerb: 'duyệt', failed: [failure()], totalCount: 1, updatedCount: 0 }}
      />,
    )

    expect(onClose).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Đã hiểu' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('vẫn hiển thị được câu hỏi không tìm thấy (không có mã, không có trạng thái)', () => {
    render(
      <BulkStatusResultDialog
        onClose={jest.fn()}
        result={{
          actionVerb: 'duyệt',
          failed: [
            failure({
              currentStatus: null,
              questionCode: null,
              reason: 'Không tìm thấy câu hỏi',
              reasonCode: 'QUESTION_NOT_FOUND',
            }),
          ],
          totalCount: 1,
          updatedCount: 0,
        }}
      />,
    )

    expect(screen.getByText('Không rõ mã')).toBeInTheDocument()
    expect(screen.getByText('Câu hỏi có thể vừa bị xóa — hãy tải lại danh sách.')).toBeInTheDocument()
  })
})
