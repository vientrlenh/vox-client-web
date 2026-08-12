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
