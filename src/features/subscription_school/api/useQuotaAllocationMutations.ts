import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, requireSchoolId } from '@/shared/api'
import type { AllocateQuotaPayload, MutationResult, QuotaUserAllocationSummary } from '../types'
import { quotaAllocationQueryKeys } from './useQuotaAllocationQueries'

async function allocateClassTestQuota(
  payload: AllocateQuotaPayload,
): Promise<MutationResult<QuotaUserAllocationSummary>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.put<MutationResult<QuotaUserAllocationSummary>>(
    `/v1/schools/${schoolId}/teachers/class-test-quota`,
    payload,
  )
  return response.data
}

async function allocatePracticeQuota(
  payload: AllocateQuotaPayload,
): Promise<MutationResult<QuotaUserAllocationSummary>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.put<MutationResult<QuotaUserAllocationSummary>>(
    `/v1/schools/${schoolId}/students/practice-quota`,
    payload,
  )
  return response.data
}

export function useAllocateClassTestQuotaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: allocateClassTestQuota,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quotaAllocationQueryKeys.classTest })
    },
  })
}

export function useAllocatePracticeQuotaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: allocatePracticeQuota,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quotaAllocationQueryKeys.practice })
    },
  })
}