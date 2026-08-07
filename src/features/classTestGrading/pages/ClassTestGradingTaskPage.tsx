import { useParams } from 'react-router'
import { TeacherGradingTaskPage } from '@/features/grading'

/**
 * Màn chấm MỘT bài của bài kiểm tra trên lớp.
 *
 * Dùng lại `TeacherGradingTaskPage` — luật vòng × hành động, thang điểm tiêu chí và
 * tính điểm thử đều nằm ở đó, viết lại là sớm muộn hai bên lệch nhau. Chỉ đổi
 * `basePath` để nút quay lại (và vòng mới mà BE mở sau khi gỡ vô hiệu) ở lại trong
 * phạm vi bài này, thay vì ném giáo viên về hàng đợi toàn trường.
 *
 * Tên học sinh + lớp không phải truyền: BE trả kèm trong `gradingTaskDetail` cho bài
 * trên lớp, và `GradingTaskDetailView` render khi có.
 */
export function ClassTestGradingTaskPage() {
  const { examId } = useParams()
  return <TeacherGradingTaskPage basePath={`/teacher/class-tests/${examId}/grading`} />
}
