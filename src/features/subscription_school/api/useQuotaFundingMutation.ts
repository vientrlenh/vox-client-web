import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, requireSchoolId } from '@/shared/api'
import type { QuotaType } from '../model'
import type { MutationResult, QuotaFundingResult } from '../types'
import { quotaAllocationQueryKeys } from './useQuotaAllocationQueries'

/**
 * Chuyển tiền từ ví tự nạp của trường sang ví hạn mức của một loại quota.
 *
 * POST, không PUT: đây là phép CỘNG DỒN chứ không phải đặt một giá trị, nên gọi hai lần là nạp hai
 * lần. Backend chưa có khoá idempotency, nên hộp thoại phải khoá nút trong lúc chờ -- và vì thao tác
 * này không hoàn lại được, đó là tuyến phòng thủ duy nhất chống bấm đúp.
 */
async function fundQuota(input: {
  amountVnd: number
  quotaType: QuotaType
  reason?: string
}): Promise<QuotaFundingResult> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<MutationResult<QuotaFundingResult>>(
    `/v1/subscriptions/schools/${schoolId}/quota-funding/${input.quotaType}`,
    { amountVnd: input.amountVnd, reason: input.reason ?? null },
  )
  return response.data.data
}

export function useFundQuotaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fundQuota,
    onSuccess: () => {
      // Nạp tiền làm đổi CẢ ba con số của màn chia hạn mức (ví hạn mức, trần chia được, tiền còn trả
      // được) trên MỌI trang, nên làm mới cả nhánh -- cùng lý do với useSetQuotaPolicyMutation.
      void queryClient.invalidateQueries({ queryKey: quotaAllocationQueryKeys.all })
    },
  })
}
