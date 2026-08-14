import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient'

export type QuestionBankStats = {
  totalQuestions: number
  totalQuestionBanks: number
  draft: number
  submittedForReview: number
  revisionRequested: number
  approved: number
  rejected: number
  published: number
  archived: number
  readAloud: number
  shortAnswer: number
  longAnswer: number
  opinion: number
  description: number
}

const QUESTION_BANK_STATS_QUERY = `
  query QuestionBankStats {
    questionBankStats {
      totalQuestions
      totalQuestionBanks
      draft
      submittedForReview
      revisionRequested
      approved
      rejected
      published
      archived
      readAloud
      shortAnswer
      longAnswer
      opinion
      description
    }
  }
`

async function fetchQuestionBankStats(): Promise<QuestionBankStats> {
  const data = await graphQLRequest<{ questionBankStats: QuestionBankStats }>(QUESTION_BANK_STATS_QUERY)
  return data.questionBankStats
}

export const questionBankStatsQueryKeys = {
  all: ['question-bank-stats'] as const,
}

export function useQuestionBankStatsQuery() {
  return useQuery({
    queryFn: fetchQuestionBankStats,
    queryKey: questionBankStatsQueryKeys.all,
  })
}
