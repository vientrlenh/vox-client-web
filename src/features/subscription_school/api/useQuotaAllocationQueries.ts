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

// Đường dẫn phải có tiền tố `/v1/subscriptions` -- SubscriptionController khai
// @RequestMapping("/api/v1/subscriptions"). Thiếu đoạn đó thì Spring không khớp route nào và trả
// 500 NoResourceFoundException, không phải 404 gọn gàng, nên nhìn từ FE rất giống lỗi server.
//
// Và hạn mức của giáo viên nay là `exam-quota`, KHÔNG còn là `class-test-quota`: backend đã gộp
// bài kiểm tra lớp vào cùng ví EXAM (AllocateClassTestQuotaCommand -> AllocateExamQuotaCommand).
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