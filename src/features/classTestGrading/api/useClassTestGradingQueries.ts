import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type {
  ExamCandidateResultStatus,
  GradingAssignmentRow,
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
        sessionId
        attemptNo
        attemptCount
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

/**
 * MỌI bài của bài kiểm tra, gồm cả bài CHƯA có phân công.
 *
 * `myClassTestGradingTasks` ở trên chỉ trả bài đã giao cho người gọi, nên bài AI chấm
 * sạch (đi thẳng RELEASED, không được mở phân công tự động) không lọt vào đó — cụ thể là
 * lượt thi thứ hai của một em biến mất khỏi màn chấm. Đây là chỗ lấy `candidateResultId`
 * để bấm "Nhận chấm".
 */
const CLASS_TEST_GRADING_RESULTS_QUERY = `
  query ClassTestGradingResults(
    $examId: ID!
    $resultStatus: String
    $unassignedOnly: Boolean
    $search: String
    $page: Int
    $size: Int
  ) {
    classTestGradingResults(
      examId: $examId
      resultStatus: $resultStatus
      unassignedOnly: $unassignedOnly
      search: $search
      page: $page
      size: $size
    ) {
      content {
        candidateResultId
        resultCode
        studentName
        className
        examName
        resultStatus
        totalScore
        flagged
        assignmentId
        teacherId
        teacherName
        roundType
        assignmentStatus
        outcome
        assignedAt
        completedAt
        deadlineAt
        overdue
        hasOpenAppeal
        sessionId
        attemptNo
        attemptCount
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

export type FetchClassTestGradingResultsInput = {
  examId: string
  page: number
  resultStatus?: '' | ExamCandidateResultStatus
  search?: string
  size: number
  unassignedOnly?: boolean
}

export const classTestGradingKeys = {
  all: ['class-test-grading'] as const,
  results: (input: FetchClassTestGradingResultsInput) =>
    [...classTestGradingKeys.all, 'results', input] as const,
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

export async function fetchClassTestGradingResults(input: FetchClassTestGradingResultsInput) {
  const data = await graphQLRequest<{
    classTestGradingResults: GradingPage<GradingAssignmentRow>
  }>(CLASS_TEST_GRADING_RESULTS_QUERY, {
    examId: input.examId,
    page: input.page,
    resultStatus: input.resultStatus || undefined,
    search: input.search?.trim() || undefined,
    size: input.size,
    // Chỉ gửi khi BẬT: `false` ở BE là một bộ lọc khác với "không lọc".
    unassignedOnly: input.unassignedOnly ? true : undefined,
  })
  return data.classTestGradingResults
}

export async function fetchClassTestGradingStats(examId: string) {
  const data = await graphQLRequest<{ classTestGradingStats: GradingStats }>(
    CLASS_TEST_GRADING_STATS_QUERY,
    { examId },
  )
  return data.classTestGradingStats
}

/** GraphQL 1-based, UI cũng 1-based — gửi thẳng `page`, không quy đổi, như feature `grading`. */
export function useClassTestGradingTasksQuery(
  examId: string,
  page: number,
  size: number,
  options?: Omit<FetchClassTestGradingTasksInput, 'examId' | 'page' | 'size'>,
) {
  const input: FetchClassTestGradingTasksInput = { ...options, examId, page, size }
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () => fetchClassTestGradingTasks(input),
    queryKey: classTestGradingKeys.tasks(input),
  })
}

export function useClassTestGradingResultsQuery(
  examId: string,
  page: number,
  size: number,
  options?: Omit<FetchClassTestGradingResultsInput, 'examId' | 'page' | 'size'>,
) {
  const input: FetchClassTestGradingResultsInput = { ...options, examId, page, size }
  return useQuery({
    enabled: Boolean(examId),
    // Giữ trang cũ trong lúc nạp trang/từ khoá mới, nếu không bảng chớp trắng mỗi lần gõ.
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchClassTestGradingResults(input),
    queryKey: classTestGradingKeys.results(input),
  })
}

export function useClassTestGradingStatsQuery(examId: string) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () => fetchClassTestGradingStats(examId),
    queryKey: classTestGradingKeys.stats(examId),
  })
}
