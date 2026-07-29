import { useQuery } from '@tanstack/react-query'
import { apiClient, requireSchoolId } from '@/shared/api'
import type { QuotaUserAllocationSummary } from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

export const quotaAllocationQueryKeys = {
  classTest: ['quota-allocation', 'class-test'] as const,
  practice: ['quota-allocation', 'practice'] as const,
}

async function fetchClassTestQuotaAllocations(): Promise<QuotaUserAllocationSummary> {
  const schoolId = requireSchoolId()
  const response = await apiClient.get<ApiResponse<QuotaUserAllocationSummary>>(
    `/v1/schools/${schoolId}/teachers/class-test-quota`,
  )
  return response.data.data
}

async function fetchPracticeQuotaAllocations(): Promise<QuotaUserAllocationSummary> {
  const schoolId = requireSchoolId()
  const response = await apiClient.get<ApiResponse<QuotaUserAllocationSummary>>(
    `/v1/schools/${schoolId}/students/practice-quota`,
  )
  return response.data.data
}

export function useClassTestQuotaAllocationsQuery() {
  return useQuery({
    queryFn: fetchClassTestQuotaAllocations,
    queryKey: quotaAllocationQueryKeys.classTest,
  })
}

export function usePracticeQuotaAllocationsQuery() {
  return useQuery({
    queryFn: fetchPracticeQuotaAllocations,
    queryKey: quotaAllocationQueryKeys.practice,
  })
}