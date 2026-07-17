import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type {
  AppealDetail,
  AppealPage,
  AppealReviewerLite,
  AppealReviewerStatus,
  AppealStats,
  AppealStatus,
  AppealSummary,
  AppealTask,
  AppealTaskDetail,
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

const APPEALS_QUERY = `
  query Appeals($status: AppealStatus, $keyword: String, $page: Int, $size: Int) {
    appeals(status: $status, keyword: $keyword, page: $page, size: $size) {
      content {
        id
        studentName
        className
        examName
        partLabel
        originalScore
        status
        requestedAt
        deadline
        reviewerCount
        doneCount
        overdue
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

const APPEAL_STATS_QUERY = `
  query AppealStats {
    appealStats {
      pending
      processing
      published
      rejected
    }
  }
`

const APPEAL_QUERY = `
  query Appeal($id: ID!) {
    appeal(id: $id) {
      id
      studentName
      className
      examName
      partLabel
      originalScore
      status
      requestedAt
      deadline
      reason
      notes
      decisionNote
      finalScore
      approvedAt
      resolvedAt
      overdue
      aiScores { ${CRITERION_SCORE_FIELDS} }
      turns { ${TURN_FIELDS} }
      reviewers {
        reviewerId
        reviewerName
        status
        done
        assignedAt
        submittedAt
        suggestedScore
        note
        scores { ${CRITERION_SCORE_FIELDS} }
      }
    }
  }
`

const MY_APPEAL_TASKS_QUERY = `
  query MyAppealTasks($status: AppealReviewerStatus, $page: Int, $size: Int) {
    myAppealTasks(status: $status, page: $page, size: $size) {
      content {
        appealId
        examName
        partLabel
        deadline
        myStatus
        overdue
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

const APPEAL_TASK_DETAIL_QUERY = `
  query AppealTaskDetail($appealId: ID!) {
    appealTaskDetail(appealId: $appealId) {
      appealId
      partLabel
      turns { ${TURN_FIELDS} }
      aiScores { ${CRITERION_SCORE_FIELDS} }
      criteria {
        id
        code
        label
        description
        minScore
        maxScore
      }
      myReport {
        reviewerId
        reviewerName
        status
        done
        assignedAt
        submittedAt
        suggestedScore
        note
        scores { ${CRITERION_SCORE_FIELDS} }
      }
    }
  }
`

const APPEAL_REVIEWERS_QUERY = `
  query AppealReviewers($keyword: String) {
    appealReviewers(keyword: $keyword) {
      id
      name
      load
    }
  }
`

export type FetchAppealsInput = {
  keyword?: string
  page: number
  size: number
  status?: '' | AppealStatus
}

export type FetchMyAppealTasksInput = {
  page: number
  size: number
  status?: '' | AppealReviewerStatus
}

export const reevaluationKeys = {
  all: ['reevaluation'] as const,
  list: (input: FetchAppealsInput) => [...reevaluationKeys.all, 'list', input] as const,
  stats: () => [...reevaluationKeys.all, 'stats'] as const,
  detail: (id: string | null) => [...reevaluationKeys.all, 'detail', id] as const,
  myTasks: (input: FetchMyAppealTasksInput) =>
    [...reevaluationKeys.all, 'my-tasks', input] as const,
  taskDetail: (appealId: string | null) =>
    [...reevaluationKeys.all, 'task-detail', appealId] as const,
  reviewers: (keyword?: string) => [...reevaluationKeys.all, 'reviewers', keyword] as const,
}

export async function fetchAppeals(input: FetchAppealsInput) {
  const data = await graphQLRequest<{ appeals: AppealPage<AppealSummary> }>(APPEALS_QUERY, {
    keyword: input.keyword || undefined,
    page: input.page,
    size: input.size,
    status: input.status || undefined,
  })
  return data.appeals
}

export async function fetchAppealStats() {
  const data = await graphQLRequest<{ appealStats: AppealStats }>(APPEAL_STATS_QUERY)
  return data.appealStats
}

export async function fetchAppeal(id: string) {
  const data = await graphQLRequest<{ appeal: AppealDetail }>(APPEAL_QUERY, { id })
  return data.appeal
}

export async function fetchMyAppealTasks(input: FetchMyAppealTasksInput) {
  const data = await graphQLRequest<{ myAppealTasks: AppealPage<AppealTask> }>(
    MY_APPEAL_TASKS_QUERY,
    {
      page: input.page,
      size: input.size,
      status: input.status || undefined,
    },
  )
  return data.myAppealTasks
}

export async function fetchAppealTaskDetail(appealId: string) {
  const data = await graphQLRequest<{ appealTaskDetail: AppealTaskDetail }>(
    APPEAL_TASK_DETAIL_QUERY,
    { appealId },
  )
  return data.appealTaskDetail
}

export async function fetchAppealReviewers(keyword?: string) {
  const data = await graphQLRequest<{ appealReviewers: AppealReviewerLite[] }>(
    APPEAL_REVIEWERS_QUERY,
    { keyword: keyword || undefined },
  )
  return data.appealReviewers
}

// Phân trang 0-based ở server, UI 1-based: -1 khi query, +1 ở `select`.
export function useAppealsQuery(
  page: number,
  size: number,
  options?: { keyword?: string; status?: '' | AppealStatus },
) {
  const input: FetchAppealsInput = {
    keyword: options?.keyword,
    page,
    size,
    status: options?.status,
  }
  return useQuery({
    queryFn: () => fetchAppeals({ ...input, page: page - 1 }),
    queryKey: reevaluationKeys.list(input),
    select: (data) => ({ ...data, page: data.page + 1 }),
  })
}

export function useAppealStatsQuery() {
  return useQuery({
    queryFn: fetchAppealStats,
    queryKey: reevaluationKeys.stats(),
  })
}

export function useAppealQuery(id: string | null) {
  return useQuery({
    enabled: id != null,
    queryFn: () => fetchAppeal(id as string),
    queryKey: reevaluationKeys.detail(id),
  })
}

export function useMyAppealTasksQuery(
  page: number,
  size: number,
  options?: { status?: '' | AppealReviewerStatus },
) {
  const input: FetchMyAppealTasksInput = { page, size, status: options?.status }
  return useQuery({
    queryFn: () => fetchMyAppealTasks({ ...input, page: page - 1 }),
    queryKey: reevaluationKeys.myTasks(input),
    select: (data) => ({ ...data, page: data.page + 1 }),
  })
}

export function useAppealTaskDetailQuery(appealId: string | null) {
  return useQuery({
    enabled: appealId != null,
    queryFn: () => fetchAppealTaskDetail(appealId as string),
    queryKey: reevaluationKeys.taskDetail(appealId),
  })
}

export function useAppealReviewersQuery(keyword?: string) {
  return useQuery({
    queryFn: () => fetchAppealReviewers(keyword),
    queryKey: reevaluationKeys.reviewers(keyword),
  })
}
