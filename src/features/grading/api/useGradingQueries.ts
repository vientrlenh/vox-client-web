import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type {
  AssignableTeacher,
  GradingAssignmentRow,
  GradingAssignmentStatus,
  GradingExamOption,
  GradingPage,
  GradingStats,
  GradingTask,
  GradingTaskDetail,
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
    $status: GradingAssignmentStatus
    $search: String
    $page: Int
    $size: Int
  ) {
    gradingAssignments(
      examId: $examId
      scheduleId: $scheduleId
      teacherId: $teacherId
      status: $status
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
        flagged
        assignmentId
        teacherId
        teacherName
        assignmentStatus
        assignedAt
        completedAt
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
      totalToGrade
      unassigned
      assigned
      completed
    }
  }
`

const MY_GRADING_TASKS_QUERY = `
  query MyGradingTasks($status: GradingAssignmentStatus, $page: Int, $size: Int) {
    myGradingTasks(status: $status, page: $page, size: $size) {
      content {
        assignmentId
        candidateResultId
        resultCode
        examName
        partCount
        status
        flagged
        assignedAt
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
      assignmentStatus
      resultStatus
      flagged
      flagReason
      currentTotalScore
      editable
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

// Chỉ id + name: đây là nguồn cho một dropdown lọc, không cần kéo cả papers/sections
// như EXAM_LIST_FIELDS của feature exam.
const GRADING_EXAM_OPTIONS_QUERY = `
  query GradingExamOptions($page: Int!, $size: Int!) {
    exams(page: $page, size: $size) {
      content {
        id
        name
      }
    }
  }
`

export type FetchGradingAssignmentsInput = {
  examId?: string
  page: number
  scheduleId?: string
  search?: string
  size: number
  status?: '' | GradingAssignmentStatus
  teacherId?: string
}

export type FetchMyGradingTasksInput = {
  page: number
  size: number
  status?: '' | GradingAssignmentStatus
}

export type FetchGradingStatsInput = {
  examId?: string
  scheduleId?: string
}

export const gradingKeys = {
  all: ['grading'] as const,
  assignments: (input: FetchGradingAssignmentsInput) =>
    [...gradingKeys.all, 'assignments', input] as const,
  stats: (input: FetchGradingStatsInput) => [...gradingKeys.all, 'stats', input] as const,
  myTasks: (input: FetchMyGradingTasksInput) => [...gradingKeys.all, 'my-tasks', input] as const,
  taskDetail: (assignmentId: string | null) =>
    [...gradingKeys.all, 'task-detail', assignmentId] as const,
  teachers: (search?: string) => [...gradingKeys.all, 'teachers', search] as const,
  examOptions: () => [...gradingKeys.all, 'exam-options'] as const,
  preview: (assignmentId: string | null, payload: unknown) =>
    [...gradingKeys.all, 'preview', assignmentId, payload] as const,
}

export async function fetchGradingAssignments(input: FetchGradingAssignmentsInput) {
  const data = await graphQLRequest<{
    gradingAssignments: GradingPage<GradingAssignmentRow>
  }>(GRADING_ASSIGNMENTS_QUERY, {
    examId: input.examId || undefined,
    page: input.page,
    scheduleId: input.scheduleId || undefined,
    search: input.search?.trim() || undefined,
    size: input.size,
    status: input.status || undefined,
    teacherId: input.teacherId || undefined,
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

export async function fetchGradingExamOptions() {
  const data = await graphQLRequest<{ exams: { content: GradingExamOption[] } }>(
    GRADING_EXAM_OPTIONS_QUERY,
    { page: 0, size: 100 },
  )
  return data.exams.content
}

// Phân trang 0-based ở server, UI 1-based: -1 khi query, +1 ở `select`.
export function useGradingAssignmentsQuery(
  page: number,
  size: number,
  options?: {
    examId?: string
    scheduleId?: string
    search?: string
    status?: '' | GradingAssignmentStatus
    teacherId?: string
  },
) {
  const input: FetchGradingAssignmentsInput = {
    examId: options?.examId,
    page,
    scheduleId: options?.scheduleId,
    search: options?.search,
    size,
    status: options?.status,
    teacherId: options?.teacherId,
  }
  return useQuery({
    queryFn: () => fetchGradingAssignments({ ...input, page: page - 1 }),
    queryKey: gradingKeys.assignments(input),
    select: (data) => ({ ...data, page: data.page + 1 }),
  })
}

export function useGradingStatsQuery(options?: { examId?: string; scheduleId?: string }) {
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
  options?: { status?: '' | GradingAssignmentStatus },
) {
  const input: FetchMyGradingTasksInput = { page, size, status: options?.status }
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
  })
}

export function useAssignableTeachersQuery(search?: string) {
  return useQuery({
    queryFn: () => fetchAssignableTeachers(search),
    queryKey: gradingKeys.teachers(search),
  })
}

export function useGradingExamOptionsQuery() {
  return useQuery({
    queryFn: fetchGradingExamOptions,
    queryKey: gradingKeys.examOptions(),
  })
}
