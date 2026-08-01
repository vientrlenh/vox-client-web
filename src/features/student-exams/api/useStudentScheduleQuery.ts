import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'

export type StudentExamSchedule = {
  id: string
  examId: string
  startDate?: string | null
  endDate?: string | null
  status: string
  room?: { name?: string | null } | null
  proctors: Array<{ teacher?: { fullName?: string | null } | null }>
}

const STUDENT_EXAM_SCHEDULES_QUERY = `
  query StudentExamSchedules {
    myExamSchedules {
      id examId startDate endDate status
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
