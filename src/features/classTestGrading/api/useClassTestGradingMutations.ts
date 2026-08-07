import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { gradingKeys } from '@/features/grading'
import type { ClaimableRoundType } from '../types'
import { classTestGradingKeys } from './useClassTestGradingQueries'

type ApiResponse<T> = {
  data: T
  message: string
}

const CLASS_TEST_BASE = '/v1/class-tests'

export type ClaimClassTestGradingInput = {
  candidateResultIds: string[]
  examId: string
  roundType: ClaimableRoundType
}

/**
 * Giáo viên tạo bài tự nhận chấm. Endpoint nằm trên facade class test chứ không phải
 * `/v1/grading-assignments`: chỗ đó chỉ school admin gọi được, và nới nó ra là mở cửa
 * cho mọi giáo viên trên mọi kỳ thi.
 */
export async function claimClassTestGrading(input: ClaimClassTestGradingInput) {
  const response = await apiClient.post<ApiResponse<string[]>>(
    `${CLASS_TEST_BASE}/${input.examId}/grading/claim`,
    { candidateResultIds: input.candidateResultIds, roundType: input.roundType },
  )
  return response.data.data
}

/**
 * Làm cũ CẢ HAI bộ query key: chấm xong một bài trên lớp cũng làm cũ hàng đợi tổng của
 * chính giáo viên đó (`/teacher/grading`), không chỉ màn của bài này.
 */
export function useInvalidateClassTestGrading() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: classTestGradingKeys.all })
    queryClient.invalidateQueries({ queryKey: gradingKeys.all })
  }
}

export function useClaimClassTestGradingMutation() {
  const invalidate = useInvalidateClassTestGrading()
  return useMutation({
    mutationFn: (input: ClaimClassTestGradingInput) => claimClassTestGrading(input),
    onSuccess: invalidate,
  })
}
