import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient'

export type SystemAdminDashboard = {
  activeFrameworkCount: number
  activeSchools: number
  inactiveSchools: number
  pendingRegistrations: number
  registrationsLast30Days: number
  registrationsLast90Days: number
  schoolAdminCount: number
  studentCount: number
  systemRubricCount: number
  teacherCount: number
  totalRevenue: number
  monthlyRevenue: { amount: number; month: string }[]
  totalSchools: number
}

const SYSTEM_ADMIN_DASHBOARD = `
  query SystemAdminDashboard {
    systemAdminDashboard {
      activeFrameworkCount
      activeSchools
      inactiveSchools
      pendingRegistrations
      registrationsLast30Days
      registrationsLast90Days
      schoolAdminCount
      studentCount
      systemRubricCount
      teacherCount
      totalRevenue
      monthlyRevenue {
        amount
        month
      }
      totalSchools
    }
  }
`

async function fetchSystemAdminDashboard(): Promise<SystemAdminDashboard> {
  const data = await graphQLRequest<{ systemAdminDashboard: SystemAdminDashboard }>(SYSTEM_ADMIN_DASHBOARD)
  return data.systemAdminDashboard
}

export const systemAdminDashboardKeys = {
  all: ['system-admin-dashboard'] as const,
}

export function useSystemAdminDashboardQuery() {
  return useQuery({
    queryFn: fetchSystemAdminDashboard,
    queryKey: systemAdminDashboardKeys.all,
  })
}
