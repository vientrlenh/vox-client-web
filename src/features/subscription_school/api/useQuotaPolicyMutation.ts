import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, requireSchoolId } from '@/shared/api'
import type { QuotaType } from '../model'
import type { MutationResult } from '../types'
import { quotaAllocationQueryKeys } from './useQuotaAllocationQueries'

/**
 * Đặt trần phân phối cho một loại hạn mức.
 * <p>Gửi TỶ LỆ (0..1), không gửi phần trăm -- 0.8 chứ không phải 80. Giao diện nhận phần trăm cho dễ
 * nhập rồi chia 100 ở đúng một chỗ, ngay trước khi gọi.
 */
async function setQuotaPolicy(input: { distributableRatio: number; quotaType: QuotaType }): Promise<number> {
  const schoolId = requireSchoolId()
  const response = await apiClient.put<MutationResult<number>>(
    `/v1/subscriptions/schools/${schoolId}/quota-policies/${input.quotaType}`,
    { distributableRatio: input.distributableRatio },
  )
  return response.data.data
}

export function useSetQuotaPolicyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: setQuotaPolicy,
    onSuccess: () => {
      // Trần đổi thì "còn chia được" của MỌI trang đổi theo, nên làm mới cả nhánh.
      void queryClient.invalidateQueries({ queryKey: quotaAllocationQueryKeys.all })
    },
  })
}
