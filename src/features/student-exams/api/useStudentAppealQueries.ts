import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient, graphQLRequest } from '@/shared/api'

export type StudentAppealSummary = {
  id: string
  className?: string | null
  examName: string
  partLabels: string[]
  originalScore?: number | null
  status: string
  requestedAt: string
  deadline?: string | null
  overdue: boolean
}

export type StudentAppealDetail = {
  id: string
  className?: string | null
  examName: string
  originalScore?: number | null
  status: string
  requestedAt: string
  deadline?: string | null
  reason: string
  notes?: string | null
  decisionNote?: string | null
  finalScore?: number | null
  approvedAt?: string | null
  resolvedAt?: string | null
  overdue: boolean
  scoringScaleMin: number
  scoringScaleMax: number
  items: Array<{
    appealItemId: string
    paperItemId: string
    partLabel?: string | null
    finalScore?: number | null
  }>
}

type AppealPage = {
  content: StudentAppealSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

const MY_APPEALS_QUERY = `
  query MyAppeals($page: Int!, $size: Int!) {
    myAppeals(page: $page, size: $size) {
      content {
        id className examName partLabels originalScore status requestedAt deadline
        overdue
      }
      page size totalElements totalPages
    }
  }
`

const MY_APPEAL_QUERY = `
  query MyAppeal($id: ID!) {
    myAppeal(id: $id) {
      id className examName originalScore status requestedAt deadline reason notes
      decisionNote finalScore approvedAt resolvedAt overdue scoringScaleMin scoringScaleMax
      items { appealItemId paperItemId partLabel finalScore }
    }
  }
`

export const studentAppealQueryKeys = {
  all: ['student-appeals'] as const,
  detail: (id: string | null) => ['student-appeals', 'detail', id] as const,
  list: (page: number) => ['student-appeals', 'list', page] as const,
}

export function useMyAppealsQuery(page = 0) {
  return useQuery({
    queryFn: async () => {
      const data = await graphQLRequest<{ myAppeals: AppealPage }>(MY_APPEALS_QUERY, { page, size: 20 })
      return data.myAppeals
    },
    queryKey: studentAppealQueryKeys.list(page),
  })
}

export function useMyAppealQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: async () => {
      const data = await graphQLRequest<{ myAppeal: StudentAppealDetail }>(MY_APPEAL_QUERY, { id })
      return data.myAppeal
    },
    queryKey: studentAppealQueryKeys.detail(id),
  })
}

export function useCreateStudentAppealMutation() {
  return useMutation({
    mutationFn: async (input: {
      candidateResultId: string
      paperItemIds: string[]
      reason: string
      notes?: string
    }) => {
      const response = await apiClient.post('/v1/exam-appeals', input)
      return response.data
    },
  })
}
