import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient'

export type SchoolAdminDashboard = {
  appealStats: {
    pending: number
    processing: number
    published: number
    rejected: number
  }
  examStatusCounts: {
    cancelled: number
    closed: number
    draft: number
    inProgress: number
    resultsPublished: number
    scheduled: number
    total: number
  }
  revenue: number
  monthlySpending: { amount: number; month: string; subscriptionAmount: number; tokenTopUpAmount: number }[]
  tokenAllocated: number
  tokenUsed: number
  subscriptionRenewal: {
    endDate: string
    planName: string | null
    status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  } | null
  /** Tiền: chuỗi thập phân nguyên vẹn, không phải number — xem toNumber trong balance_school/model. */
  funding: {
    balanceVnd: string
    /** Đã phân chia cho giáo viên, họ chưa tiêu. Không bao giờ âm. */
    committedToUsersVnd: string
    examQuotaRemainingVnd: string
    examQuotaTotalVnd: string
    locked: boolean
    spendableVnd: string
    /** spendable − committedToUsers. ÂM = trường đã phân chia nhiều hơn số còn lại, xem dashboard.graphqls. */
    uncommittedVnd: string
  }
  unscored: {
    aiFailed: number
    aiFailedNoRetryLeft: number
    aiFailedRetryLeft: number
    assignedInProgress: number
    assignedOverdue: number
    awaitingAssignment: number
    examCount: number
    /** null = hàng đợi sạch. KHÁC 0, vốn nghĩa là "có bài, vừa nộp hôm nay". */
    oldestWaitingDays: number | null
    total: number
  }
  examsAwaitingPublish: {
    aiFailedNoRetryLeft: number
    aiFailedRetryLeft: number
    awaitingHumanGrading: number
    closeAt: string | null
    code: string
    examId: string
    name: string
    unscoredCount: number
  }[]
  /** null = không còn đơn nào chờ. KHÁC 0. */
  oldestPendingAppealDays: number | null
}

const SCHOOL_ADMIN_DASHBOARD = `
  query SchoolAdminDashboard {
    schoolAdminDashboard {
      appealStats {
        pending
        processing
        published
        rejected
      }
      examStatusCounts {
        cancelled
        closed
        draft
        inProgress
        resultsPublished
        scheduled
        total
      }
      revenue
      monthlySpending {
        amount
        month
        subscriptionAmount
        tokenTopUpAmount
      }
      tokenAllocated
      tokenUsed
      subscriptionRenewal {
        endDate
        planName
        status
      }
      funding {
        balanceVnd
        committedToUsersVnd
        examQuotaRemainingVnd
        examQuotaTotalVnd
        locked
        spendableVnd
        uncommittedVnd
      }
      unscored {
        aiFailed
        aiFailedNoRetryLeft
        aiFailedRetryLeft
        assignedInProgress
        assignedOverdue
        awaitingAssignment
        examCount
        oldestWaitingDays
        total
      }
      examsAwaitingPublish {
        aiFailedNoRetryLeft
        aiFailedRetryLeft
        awaitingHumanGrading
        closeAt
        code
        examId
        name
        unscoredCount
      }
      oldestPendingAppealDays
    }
  }
`

async function fetchSchoolAdminDashboard(): Promise<SchoolAdminDashboard> {
  const data = await graphQLRequest<{ schoolAdminDashboard: SchoolAdminDashboard }>(SCHOOL_ADMIN_DASHBOARD)
  return data.schoolAdminDashboard
}

export const schoolAdminDashboardKeys = {
  all: ['school-admin-dashboard'] as const,
}

export function useSchoolAdminDashboardQuery() {
  return useQuery({
    queryFn: fetchSchoolAdminDashboard,
    queryKey: schoolAdminDashboardKeys.all,
  })
}
