import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type {
  AppealDetail,
  AppealPage,
  AppealReviewerLite,
  AppealStats,
  AppealStatus,
  AppealSummary,
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

const APPEAL_ITEM_FIELDS = `
  appealItemId
  paperItemId
  partLabel
  finalScore
  baselineScores { ${CRITERION_SCORE_FIELDS} }
  turns { ${TURN_FIELDS} }
`

const APPEALS_QUERY = `
  query Appeals($status: AppealStatus, $keyword: String, $page: Int, $size: Int) {
    appeals(status: $status, keyword: $keyword, page: $page, size: $size) {
      content {
        id
        studentName
        className
        examName
        partLabels
        originalScore
        status
        requestedAt
        deadline
        reviewerName
        reviewerStatus
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
      withdrawn
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
      withdrawnAt
      reviewerOverrideReason
      overdue
      scoringScaleMin
      scoringScaleMax
      items { ${APPEAL_ITEM_FIELDS} }
      reviewer {
        assignmentId
        reviewerId
        reviewerName
        status
        outcome
        assignedAt
        completedAt
        deadlineAt
        overdue
      }
    }
  }
`

// `appealId` quyết định cờ `conflicted` (ai đã chấm tay chính bài này) — bỏ đi thì
// picker mất cảnh báo xung đột lợi ích và admin gán nhầm mà không biết.
const APPEAL_REVIEWERS_QUERY = `
  query AppealReviewers($appealId: ID, $keyword: String) {
    appealReviewers(appealId: $appealId, keyword: $keyword) {
      id
      name
      load
      conflicted
      user { avatarUrl }
    }
  }
`

export type FetchAppealsInput = {
  keyword?: string
  page: number
  size: number
  status?: '' | AppealStatus
}

export const reevaluationKeys = {
  all: ['reevaluation'] as const,
  list: (input: FetchAppealsInput) => [...reevaluationKeys.all, 'list', input] as const,
  stats: () => [...reevaluationKeys.all, 'stats'] as const,
  detail: (id: string | null) => [...reevaluationKeys.all, 'detail', id] as const,
  reviewers: (appealId: string | null, keyword?: string) =>
    [...reevaluationKeys.all, 'reviewers', appealId, keyword] as const,
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

export async function fetchAppealReviewers(appealId: string | null, keyword?: string) {
  const data = await graphQLRequest<{ appealReviewers: AppealReviewerLite[] }>(
    APPEAL_REVIEWERS_QUERY,
    { appealId: appealId || undefined, keyword: keyword || undefined },
  )
  return data.appealReviewers
}

// GraphQL 1-based, UI cũng 1-based: gửi thẳng `page`, đọc thẳng `response.page`. Chỗ trừ 1 nằm ở
// adapter phía BE (`PageRequest.of(page - 1, size)`), nên cộng/trừ thêm ở đây là lệch đúng một trang.
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
    queryFn: () => fetchAppeals(input),
    queryKey: reevaluationKeys.list(input),
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

export function useAppealReviewersQuery(appealId: string | null, keyword?: string) {
  return useQuery({
    enabled: appealId != null,
    queryFn: () => fetchAppealReviewers(appealId, keyword),
    queryKey: reevaluationKeys.reviewers(appealId, keyword),
  })
}
