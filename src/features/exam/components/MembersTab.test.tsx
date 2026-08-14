import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ExamMemberDto } from '@/features/examCore/types'
import { MembersTab } from './MembersTab'

const EXAM_ID = 'exam-1'

function member(overrides: Partial<ExamMemberDto> = {}): ExamMemberDto {
  return {
    examId: EXAM_ID,
    id: 'member-1',
    role: 'AUTHOR',
    user: { email: 'author@example.com', fullName: 'Nguyễn Văn A', id: 'user-1' },
    userId: 'user-1',
    ...overrides,
  } as ExamMemberDto
}

function renderTab(locked: boolean) {
  return renderWithProviders(
    <MembersTab canManage canManageChair examId={EXAM_ID} locked={locked} members={[member()]} />,
  )
}

describe('MembersTab', () => {
  it('cho quản trị trường lập hội đồng khi kỳ thi chưa khóa', () => {
    renderTab(false)

    expect(screen.getByRole('button', { name: 'Thêm thành viên' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xóa Nguyễn Văn A khỏi hội đồng/ })).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.queryByText(/Kỳ thi đã bắt đầu/)).not.toBeInTheDocument()
  })

  /**
   * Đổi người ra đề lúc thí sinh đang làm bài chỉ tạo tranh chấp trách nhiệm — hội đồng chốt cùng lúc
   * với mã đề.
   */
  it('khóa mọi thao tác hội đồng và nói rõ lý do khi kỳ thi đã bắt đầu', () => {
    renderTab(true)

    expect(screen.queryByRole('button', { name: 'Thêm thành viên' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /khỏi hội đồng/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText(/Kỳ thi đã bắt đầu/)).toBeInTheDocument()
  })

  it('vẫn hiển thị danh sách thành viên ở chế độ chỉ xem', () => {
    renderTab(true)

    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument()
    expect(screen.getByText('author@example.com')).toBeInTheDocument()
  })
})
