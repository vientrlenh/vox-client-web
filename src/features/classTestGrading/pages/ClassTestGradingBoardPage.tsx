import { useParams } from 'react-router'
import { SchoolAdminGradingPage } from '@/features/grading'

/**
 * Bảng chấm bài trên lớp phía nhà trường — **chỉ đọc**.
 *
 * Giáo viên tạo bài tự chấm hết, nên BE từ chối mọi thao tác điều phối của nhà trường
 * trên bài trên lớp (`ExamGradingAccessService.rejectClassTestCoordination`). `readOnly`
 * ẩn đúng những nút đó; nếu để nguyên thì admin bấm vào chỉ nhận 403.
 *
 * Vẫn giữ bảng, thống kê, tab chất lượng AI và xuất bảng điểm — nhà trường cần nhìn
 * được tiến độ, chỉ là không can thiệp.
 */
export function ClassTestGradingBoardPage() {
  const { examId } = useParams()
  return (
    <SchoolAdminGradingPage
      fixedExamId={examId}
      readOnly
      title="Theo dõi chấm bài kiểm tra trên lớp"
    />
  )
}
