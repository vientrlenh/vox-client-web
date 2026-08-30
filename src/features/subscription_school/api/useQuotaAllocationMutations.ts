import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, requireSchoolId } from '@/shared/api'
import type { AllocateQuotaPayload, MutationResult } from '../types'
import { quotaAllocationQueryKeys } from './useQuotaAllocationQueries'


async function allocateExamQuota(payload: AllocateQuotaPayload): Promise<MutationResult<unknown>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.put<MutationResult<unknown>>(
    `/v1/subscriptions/schools/${schoolId}/teachers/exam-quota`,
    payload,
  )
  return response.data
}

async function allocatePracticeQuota(payload: AllocateQuotaPayload): Promise<MutationResult<unknown>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.put<MutationResult<unknown>>(
    `/v1/subscriptions/schools/${schoolId}/students/practice-quota`,
    payload,
  )
  return response.data
}

export function useAllocateExamQuotaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: allocateExamQuota,
    onSuccess: () => {
      // Làm mới CẢ NHÁNH: khoá truy vấn giờ mang theo số trang và từ khoá, nên nhắm vào một khoá cụ
      // thể sẽ bỏ sót mọi trang khác -- kể cả trang người dùng quay lại ngay sau đó.
      void queryClient.invalidateQueries({ queryKey: quotaAllocationQueryKeys.all })
    },
  })
}

export function useAllocatePracticeQuotaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: allocatePracticeQuota,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quotaAllocationQueryKeys.all })
    },
  })
}
