import { useMutation, useQueryClient } from '@tanstack/react-query'
import { gradingKeys } from '@/features/grading/api/useGradingQueries'
import { apiClient } from '@/shared/api'
import { reevaluationKeys } from './useReevaluationQueries'

type ApiResponse<T> = {
  data: T
  message: string
}

const BASE = '/v1/exam-appeals'

/**
 * Giao MỘT giám khảo chấm lại. `overrideReason` chỉ cần khi người được chọn đã chấm tay
 * chính bài này (`AppealReviewerLite.conflicted`) — BE dùng nó làm dấu vết cho quyết định
 * bỏ qua xung đột lợi ích. Gán lại lần nữa = đổi người, không có thao tác gỡ riêng.
 */
export type AssignReviewerInput = {
  reviewerId: string
  overrideReason?: string
  deadlineAt?: string | null
}

export async function approveAppeal(id: string, deadline: string) {
  const response = await apiClient.post<ApiResponse<string>>(`${BASE}/${id}/approve`, { deadline })
  return response.data.message
}

export async function rejectAppeal(id: string, reason: string) {
  const response = await apiClient.post<ApiResponse<string>>(`${BASE}/${id}/reject`, { reason })
  return response.data.message
}

/** Trả về id của DÒNG PHÂN CÔNG vừa tạo, không phải id đơn. */
export async function assignReviewer(id: string, input: AssignReviewerInput) {
  const response = await apiClient.post<ApiResponse<string>>(`${BASE}/${id}/reviewer`, {
    deadlineAt: input.deadlineAt ?? undefined,
    overrideReason: input.overrideReason || undefined,
    reviewerId: input.reviewerId,
  })
  return response.data.data
}

function useInvalidateReevaluation() {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: reevaluationKeys.all })
    // Giao giám khảo = mở một phân công chấm bài vòng APPEAL, nên hàng chờ bên
    // feature `grading` cũng đổi theo.
    await queryClient.invalidateQueries({ queryKey: gradingKeys.all })
  }
}

export function useApproveMutation() {
  const invalidate = useInvalidateReevaluation()
  return useMutation({
    mutationFn: ({ id, deadline }: { id: string; deadline: string }) => approveAppeal(id, deadline),
    onSuccess: invalidate,
  })
}

export function useRejectMutation() {
  const invalidate = useInvalidateReevaluation()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectAppeal(id, reason),
    onSuccess: invalidate,
  })
}

export function useAssignMutation() {
  const invalidate = useInvalidateReevaluation()
  return useMutation({
    mutationFn: ({ id, ...input }: AssignReviewerInput & { id: string }) =>
      assignReviewer(id, input),
    onSuccess: invalidate,
  })
}
