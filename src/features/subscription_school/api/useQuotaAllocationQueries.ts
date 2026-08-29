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

// Không có fullName ở QuotaUserAllocationSummaryResponse (BE) -- ví hạn mức chỉ biết userId, chưa
// join sang hồ sơ người dùng. fullName luôn null cho tới khi có API riêng bổ sung tên hiển thị.
async function fetchClassTestQuotaAllocations(): Promise<QuotaUserAllocationSummary> {
  const schoolId = requireSchoolId()
  const response = await apiClient.get<ApiResponse<QuotaUserAllocationSummary>>(
    `/v1/subscriptions/schools/${schoolId}/teachers/exam-quota`,
  )
  return response.data.data
}

async function fetchPracticeQuotaAllocations(): Promise<QuotaUserAllocationSummary> {
  const schoolId = requireSchoolId()
  const response = await apiClient.get<ApiResponse<QuotaUserAllocationSummary>>(
    `/v1/subscriptions/schools/${schoolId}/students/practice-quota`,
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
