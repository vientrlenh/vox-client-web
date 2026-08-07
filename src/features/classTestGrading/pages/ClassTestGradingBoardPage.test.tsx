import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { SchoolAdminGradingPage } from '@/features/grading'

/**
 * Ca đối chứng của §2.4: BE từ chối MỌI thao tác điều phối của nhà trường trên bài
 * kiểm tra trên lớp (`ExamGradingAccessService.rejectClassTestCoordination`). Dựng nút
 * ở đây là hứa một điều bấm vào chỉ nhận 403.
 *
 * Test trực tiếp `SchoolAdminGradingPage` với `readOnly` thay vì qua
 * `ClassTestGradingBoardPage` để khỏi phải dựng router có `:examId` — trang đó chỉ là
 * wrapper `useParams()` truyền đúng hai prop này.
 */
const WRITE_BUTTONS = ['Phân công tự động', 'Phân công', 'Đổi giáo viên', 'Đặt hạn chấm', 'Thu hồi']

describe('bảng theo dõi chấm bài kiểm tra trên lớp (chỉ đọc)', () => {
  it('không dựng bất kỳ nút điều phối nào', () => {
    renderWithProviders(<SchoolAdminGradingPage fixedExamId="e1" readOnly title="Theo dõi" />)

    for (const label of WRITE_BUTTONS) {
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument()
    }
  })

  it('không dựng ô tick chọn hàng loạt', () => {
    renderWithProviders(<SchoolAdminGradingPage fixedExamId="e1" readOnly title="Theo dõi" />)

    // Không có thao tác hàng loạt nào thì ô tick chỉ gây hiểu nhầm.
    expect(screen.queryByLabelText('Chọn tất cả bài trong trang')).not.toBeInTheDocument()
  })

  it('vẫn dựng nút điều phối ở chế độ bình thường', () => {
    // Đối chứng: nếu ba ca trên xanh chỉ vì trang không render được thì ca này cũng đỏ.
    renderWithProviders(<SchoolAdminGradingPage />)

    expect(screen.getByRole('button', { name: 'Phân công tự động' })).toBeInTheDocument()
    expect(screen.getByLabelText('Chọn tất cả bài trong trang')).toBeInTheDocument()
  })
})
