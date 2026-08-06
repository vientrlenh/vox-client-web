import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'

export type StudentExamSchedule = {
  id: string
  examId: string
  exam?: { id: string; kind?: string | null; name?: string | null } | null
  startDate?: string | null
  endDate?: string | null
  status: string
  room?: { name?: string | null } | null
  proctors: Array<{ teacher?: { fullName?: string | null } | null }>
}

// Tên/loại kỳ thi lấy thẳng ở đây thay vì gọi thêm danh sách bài thi — danh sách đó đã phân trang
// nên chỉ tra được tên của trang đầu.
const STUDENT_EXAM_SCHEDULES_QUERY = `
  query StudentExamSchedules {
    myExamSchedules {
      id examId startDate endDate status
      exam { id name kind }
      room { name }
      proctors { teacher { fullName } }
    }
  }
`

export function useStudentScheduleQuery() {
  return useQuery({
    queryFn: async () => {
      const data = await graphQLRequest<{ myExamSchedules: StudentExamSchedule[] }>(STUDENT_EXAM_SCHEDULES_QUERY)
      return data.myExamSchedules
    },
    queryKey: ['student-exams', 'schedule'],
  })
}
