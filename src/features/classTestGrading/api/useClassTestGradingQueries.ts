import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type {
  GradingAssignmentStatus,
  GradingPage,
  GradingRoundType,
  GradingStats,
  GradingTask,
} from '@/features/grading'

/**
 * Query GraphQL của màn chấm bài trên lớp.
 *
 * ⚠️ Viết ĐẦY ĐỦ, không dựng bằng `.replace()` trên query của kỳ thi tập trung như bản
 * cũ làm. Mẹo đó chỉ hợp lý khi hai màn ở chung một file; tách feature rồi thì nó thành
 * ràng buộc ngầm giữa hai feature — đổi một ký tự bên `grading` là bên này vỡ lúc CHẠY
 * chứ không phải lúc build.
 */
const MY_CLASS_TEST_GRADING_TASKS_QUERY = `
  query MyClassTestGradingTasks(
    $examId: ID!
    $status: GradingAssignmentStatus
    $roundType: GradingRoundType
    $page: Int
    $size: Int
  ) {
    myClassTestGradingTasks(
      examId: $examId
      status: $status
      roundType: $roundType
      page: $page
      size: $size
    ) {
      content {
        assignmentId
        candidateResultId
        resultCode
        examName
        partCount
        roundType
        status
        resultStatus
        currentScore
        flagged
        assignedAt
        deadlineAt
        overdue
        studentName
        className
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

const CLASS_TEST_GRADING_STATS_QUERY = `
  query ClassTestGradingStats($examId: ID!) {
    classTestGradingStats(examId: $examId) {
      total
      byResultStatus {
        status
        count
      }
      unassigned
      assigned
      overdue
      teacherProgress {
        teacherId
        teacherName
        assigned
        completed
        overdue
      }
    }
  }
`

export type FetchClassTestGradingTasksInput = {
  examId: string
  page: number
  roundType?: '' | GradingRoundType
  size: number
  status?: '' | GradingAssignmentStatus
}

export const classTestGradingKeys = {
  all: ['class-test-grading'] as const,
  stats: (examId: string) => [...classTestGradingKeys.all, 'stats', examId] as const,
  tasks: (input: FetchClassTestGradingTasksInput) =>
    [...classTestGradingKeys.all, 'tasks', input] as const,
}

export async function fetchClassTestGradingTasks(input: FetchClassTestGradingTasksInput) {
  const data = await graphQLRequest<{
    myClassTestGradingTasks: GradingPage<GradingTask>
  }>(MY_CLASS_TEST_GRADING_TASKS_QUERY, {
    examId: input.examId,
    page: input.page,
    roundType: input.roundType || undefined,
    size: input.size,
    status: input.status || undefined,
  })
  return data.myClassTestGradingTasks
}

export async function fetchClassTestGradingStats(examId: string) {
  const data = await graphQLRequest<{ classTestGradingStats: GradingStats }>(
    CLASS_TEST_GRADING_STATS_QUERY,
    { examId },
  )
  return data.classTestGradingStats
}

/** BE phân trang 0-based, UI 1-based — quy đổi ở đúng một chỗ, như feature `grading`. */
export function useClassTestGradingTasksQuery(
  examId: string,
  page: number,
  size: number,
  options?: Omit<FetchClassTestGradingTasksInput, 'examId' | 'page' | 'size'>,
) {
  const input: FetchClassTestGradingTasksInput = { ...options, examId, page, size }
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () => fetchClassTestGradingTasks({ ...input, page: page - 1 }),
    queryKey: classTestGradingKeys.tasks(input),
    select: (data) => ({ ...data, page: data.page + 1 }),
  })
}

export function useClassTestGradingStatsQuery(examId: string) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () => fetchClassTestGradingStats(examId),
    queryKey: classTestGradingKeys.stats(examId),
  })
}
