import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type {
  AiQualityReport,
  AssignableTeacher,
  ExamCandidateResultStatus,
  GradingAssignmentRow,
  GradingAssignmentStatus,
  GradingPage,
  GradingRoundType,
  GradingStats,
  GradingTask,
  GradingTaskDetail,
  ResultStatusHistoryEntry,
} from '../types'

const CRITERION_SCORE_FIELDS = `
  criterionId
  criterionCode
  label
  score
  rationale
`

const TURN_FIELDS = `
  id
  turnOrder
  turnType
  promptText
  audioUrl
  transcript
  durationSeconds
`

const GRADING_ASSIGNMENTS_QUERY = `
  query GradingAssignments(
    $examId: ID
    $scheduleId: ID
    $teacherId: ID
    $resultStatus: String
    $roundType: GradingRoundType
    $status: GradingAssignmentStatus
    $unassignedOnly: Boolean
    $overdueOnly: Boolean
    $hasOpenAppeal: Boolean
    $search: String
    $page: Int
    $size: Int
  ) {
    gradingAssignments(
      examId: $examId
      scheduleId: $scheduleId
      teacherId: $teacherId
      resultStatus: $resultStatus
      roundType: $roundType
      status: $status
      unassignedOnly: $unassignedOnly
      overdueOnly: $overdueOnly
      hasOpenAppeal: $hasOpenAppeal
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
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

const GRADING_STATS_QUERY = `
  query GradingStats($examId: ID, $scheduleId: ID) {
    gradingStats(examId: $examId, scheduleId: $scheduleId) {
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

const MY_GRADING_TASKS_QUERY = `
  query MyGradingTasks(
    $status: GradingAssignmentStatus
    $roundType: GradingRoundType
    $page: Int
    $size: Int
  ) {
    myGradingTasks(status: $status, roundType: $roundType, page: $page, size: $size) {
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
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

const GRADING_TASK_DETAIL_QUERY = `
  query GradingTaskDetail($assignmentId: ID!) {
    gradingTaskDetail(assignmentId: $assignmentId) {
      assignmentId
      candidateResultId
      resultCode
      examName
      roundType
      assignmentStatus
      resultStatus
      flagged
      flagReason
      currentTotalScore
      scoreBefore
      deadlineAt
      overdue
      editable
      allowedOutcomes
      appealReason
      items {
        paperItemId
        responseId
        partLabel
        currentItemScore
        currentFeedbackSummary
        currentScores { ${CRITERION_SCORE_FIELDS} }
        turns { ${TURN_FIELDS} }
      }
      criteria {
        id
        code
        label
        description
        minScore
        maxScore
        weight
        required
      }
    }
  }
`

const ASSIGNABLE_TEACHERS_QUERY = `
  query AssignableTeachers($search: String) {
    assignableTeachers(search: $search) {
      id
      name
      load
    }
  }
`

const RESULT_STATUS_HISTORY_QUERY = `
  query ResultStatusHistory($candidateResultId: ID!) {
    resultStatusHistory(candidateResultId: $candidateResultId) {
      id
      candidateResultId
      fromStatus
      toStatus
      scoreBefore
      scoreAfter
      source
      actorId
      actorName
      reason
      createdAt
    }
  }
`

const AI_QUALITY_REPORT_QUERY = `
  query AiQualityReport($examId: ID) {
    aiQualityReport(examId: $examId) {
      reviewed
      upheld
      regraded
      invalidated
      regradeRate
      averageDelta
      maxDelta
      byTeacher {
        teacherId
        teacherName
        reviewed
        regraded
        averageDelta
      }
    }
  }
`

export type FetchGradingAssignmentsInput = {
  examId?: string
  hasOpenAppeal?: boolean
  overdueOnly?: boolean
  page: number
  resultStatus?: '' | ExamCandidateResultStatus
  roundType?: '' | GradingRoundType
  scheduleId?: string
  search?: string
  size: number
  status?: '' | GradingAssignmentStatus
  teacherId?: string
  unassignedOnly?: boolean
}

export type FetchMyGradingTasksInput = {
  page: number
  roundType?: '' | GradingRoundType
  size: number
  status?: '' | GradingAssignmentStatus
}

export type FetchGradingStatsInput = {
  examId?: string
  scheduleId?: string
}

export const gradingKeys = {
  aiQuality: (examId?: string) => [...gradingKeys.all, 'ai-quality', examId ?? ''] as const,
  all: ['grading'] as const,
  assignments: (input: FetchGradingAssignmentsInput) =>
    [...gradingKeys.all, 'assignments', input] as const,
  finalizePreview: (examId: string | null) =>
    [...gradingKeys.all, 'finalize-preview', examId] as const,
  history: (candidateResultId: string | null) =>
    [...gradingKeys.all, 'result-history', candidateResultId] as const,
  myTasks: (input: FetchMyGradingTasksInput) => [...gradingKeys.all, 'my-tasks', input] as const,
  preview: (assignmentId: string | null, payload: unknown) =>
    [...gradingKeys.all, 'preview', assignmentId, payload] as const,
  stats: (input: FetchGradingStatsInput) => [...gradingKeys.all, 'stats', input] as const,
  taskDetail: (assignmentId: string | null) =>
    [...gradingKeys.all, 'task-detail', assignmentId] as const,
  teachers: (search?: string) => [...gradingKeys.all, 'teachers', search] as const,
}

export async function fetchGradingAssignments(input: FetchGradingAssignmentsInput) {
  const data = await graphQLRequest<{
    gradingAssignments: GradingPage<GradingAssignmentRow>
  }>(GRADING_ASSIGNMENTS_QUERY, {
    examId: input.examId || undefined,
    // Ba cờ boolean chỉ gửi khi BẬT: gửi `false` là một bộ lọc khác hẳn với "không lọc"
    // ở `hasOpenAppeal` (false = chỉ bài KHÔNG có đơn đang mở).
    hasOpenAppeal: input.hasOpenAppeal ? true : undefined,
    overdueOnly: input.overdueOnly ? true : undefined,
    page: input.page,
    resultStatus: input.resultStatus || undefined,
    roundType: input.roundType || undefined,
    scheduleId: input.scheduleId || undefined,
    search: input.search?.trim() || undefined,
    size: input.size,
    status: input.status || undefined,
    teacherId: input.teacherId || undefined,
    unassignedOnly: input.unassignedOnly ? true : undefined,
  })
  return data.gradingAssignments
}

export async function fetchGradingStats(input: FetchGradingStatsInput) {
  const data = await graphQLRequest<{ gradingStats: GradingStats }>(GRADING_STATS_QUERY, {
    examId: input.examId || undefined,
    scheduleId: input.scheduleId || undefined,
  })
  return data.gradingStats
}

export async function fetchMyGradingTasks(input: FetchMyGradingTasksInput) {
  const data = await graphQLRequest<{ myGradingTasks: GradingPage<GradingTask> }>(
    MY_GRADING_TASKS_QUERY,
    {
      page: input.page,
      roundType: input.roundType || undefined,
      size: input.size,
      status: input.status || undefined,
    },
  )
  return data.myGradingTasks
}

export async function fetchGradingTaskDetail(assignmentId: string) {
  const data = await graphQLRequest<{ gradingTaskDetail: GradingTaskDetail }>(
    GRADING_TASK_DETAIL_QUERY,
    { assignmentId },
  )
  return data.gradingTaskDetail
}

export async function fetchAssignableTeachers(search?: string) {
  const data = await graphQLRequest<{ assignableTeachers: AssignableTeacher[] }>(
    ASSIGNABLE_TEACHERS_QUERY,
    { search: search?.trim() || undefined },
  )
  return data.assignableTeachers
}

export async function fetchResultStatusHistory(candidateResultId: string) {
  const data = await graphQLRequest<{ resultStatusHistory: ResultStatusHistoryEntry[] }>(
    RESULT_STATUS_HISTORY_QUERY,
    { candidateResultId },
  )
  return data.resultStatusHistory
}

export async function fetchAiQualityReport(examId?: string) {
  const data = await graphQLRequest<{ aiQualityReport: AiQualityReport }>(AI_QUALITY_REPORT_QUERY, {
    examId: examId || undefined,
  })
  return data.aiQualityReport
}

// Phân trang 0-based ở server, UI 1-based: -1 khi query, +1 ở `select`.
export function useGradingAssignmentsQuery(
  page: number,
  size: number,
  options?: Omit<FetchGradingAssignmentsInput, 'page' | 'size'>,
) {
  const input: FetchGradingAssignmentsInput = { ...options, page, size }
  return useQuery({
    queryFn: () => fetchGradingAssignments({ ...input, page: page - 1 }),
    queryKey: gradingKeys.assignments(input),
    select: (data) => ({ ...data, page: data.page + 1 }),
  })
}

export function useGradingStatsQuery(options?: FetchGradingStatsInput) {
  const input: FetchGradingStatsInput = {
    examId: options?.examId,
    scheduleId: options?.scheduleId,
  }
  return useQuery({
    queryFn: () => fetchGradingStats(input),
    queryKey: gradingKeys.stats(input),
  })
}

export function useMyGradingTasksQuery(
  page: number,
  size: number,
  options?: Omit<FetchMyGradingTasksInput, 'page' | 'size'>,
) {
  const input: FetchMyGradingTasksInput = { ...options, page, size }
  return useQuery({
    queryFn: () => fetchMyGradingTasks({ ...input, page: page - 1 }),
    queryKey: gradingKeys.myTasks(input),
    select: (data) => ({ ...data, page: data.page + 1 }),
  })
}

export function useGradingTaskDetailQuery(assignmentId: string | null) {
  return useQuery({
    enabled: assignmentId != null,
    queryFn: () => fetchGradingTaskDetail(assignmentId as string),
    queryKey: gradingKeys.taskDetail(assignmentId),
    // Điểm giáo viên đang nhập nằm ở state cục bộ; refetch khi focus lại chỉ tốn
    // request mà không đổi gì trên màn — tắt cho nhất quán với preview.
    refetchOnWindowFocus: false,
  })
}

export function useAssignableTeachersQuery(search?: string) {
  return useQuery({
    queryFn: () => fetchAssignableTeachers(search),
    queryKey: gradingKeys.teachers(search),
  })
}

export function useResultStatusHistoryQuery(candidateResultId: string | null) {
  return useQuery({
    enabled: candidateResultId != null,
    queryFn: () => fetchResultStatusHistory(candidateResultId as string),
    queryKey: gradingKeys.history(candidateResultId),
  })
}

export function useAiQualityReportQuery(examId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled !== false,
    queryFn: () => fetchAiQualityReport(examId),
    queryKey: gradingKeys.aiQuality(examId),
  })
}
