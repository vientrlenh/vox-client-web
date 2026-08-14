import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient'

export type NearestCentralizedExamStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'CLOSED' | 'RESULTS_PUBLISHED' | 'CANCELLED'

export type NearestCentralizedExam = {
  examId: string
  code: string
  name: string
  status: NearestCentralizedExamStatus
  openAt: string | null
  closeAt: string | null
  totalCandidates: number
  absentCandidates: number
}

const NEAREST_CENTRALIZED_EXAM_QUERY = `
  query NearestCentralizedExam {
    nearestCentralizedExam {
      examId
      code
      name
      status
      openAt
      closeAt
      totalCandidates
      absentCandidates
    }
  }
`

async function fetchNearestCentralizedExam(): Promise<NearestCentralizedExam | null> {
  const data = await graphQLRequest<{ nearestCentralizedExam: NearestCentralizedExam | null }>(NEAREST_CENTRALIZED_EXAM_QUERY)
  return data.nearestCentralizedExam
}

export const nearestCentralizedExamQueryKeys = {
  all: ['nearest-centralized-exam'] as const,
}

export function useNearestCentralizedExamQuery() {
  return useQuery({
    queryFn: fetchNearestCentralizedExam,
    queryKey: nearestCentralizedExamQueryKeys.all,
  })
}
