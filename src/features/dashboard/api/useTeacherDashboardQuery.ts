import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient'

export type TeacherDashboard = {
  examStatusCounts: {
    cancelled: number
    closed: number
    draft: number
    inProgress: number
    resultsPublished: number
    scheduled: number
    total: number
  }
  gradingStats: {
    completed: number
    pending: number
  }
  scoreStats: {
    averageScore: number | null
    gradedCount: number
    totalCandidates: number
  }
  classScoreStats: {
    examName: string
    className: string
    averageScore: number | null
    highestScore: number | null
    lowestScore: number | null
    gradedCount: number
    totalCandidates: number
  }[]
}

const TEACHER_DASHBOARD = `
  query TeacherDashboard {
    teacherDashboard {
      examStatusCounts {
        cancelled
        closed
        draft
        inProgress
        resultsPublished
        scheduled
        total
      }
      gradingStats {
        completed
        pending
      }
      scoreStats {
        averageScore
        gradedCount
        totalCandidates
      }
      classScoreStats {
        examName
        className
        averageScore
        highestScore
        lowestScore
        gradedCount
        totalCandidates
      }
    }
  }
`

async function fetchTeacherDashboard(): Promise<TeacherDashboard> {
  const data = await graphQLRequest<{ teacherDashboard: TeacherDashboard }>(TEACHER_DASHBOARD)
  return data.teacherDashboard
}

export const teacherDashboardKeys = {
  all: ['teacher-dashboard'] as const,
}

export function useTeacherDashboardQuery() {
  return useQuery({
    queryFn: fetchTeacherDashboard,
    queryKey: teacherDashboardKeys.all,
  })
}
