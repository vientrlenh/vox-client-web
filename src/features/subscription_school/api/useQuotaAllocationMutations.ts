import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, requireSchoolId } from '@/shared/api'
import type { AllocateQuotaPayload, MutationResult } from '../types'
import { quotaAllocationQueryKeys } from './useQuotaAllocationQueries'

/**
 * Đường GHI vẫn ở REST -- đọc GraphQL, ghi REST theo quy ước chung. Chỉ đường ĐỌC chuyển sang
 * GraphQL (xem useQuotaAllocationQueries).
 *
 * <p>Đường dẫn là `exam-quota`, KHÔNG phải `class-test-quota`. Bản trước gọi nhầm sang một đường
 * không tồn tại: V2 gộp CLASS_TEST vào EXAM và đổi tên cả hai endpoint, nhưng client không được sửa
 * theo, nên mọi lần chia hạn mức cho giáo viên đều trả 404 -- cả đọc lẫn ghi.
 *
 * <p>Phản hồi trả về bản tóm tắt KHÔNG phân trang của backend; client không dựng gì từ nó mà chỉ làm
 * mới lại truy vấn đã phân trang, nên ở đây không mô hình hoá kiểu của nó.
 */
async function allocateExamQuota(payload: AllocateQuotaPayload): Promise<MutationResult<unknown>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.put<MutationResult<unknown>>(
    `/v1/schools/${schoolId}/teachers/exam-quota`,
    payload,
  )
  return response.data
}

async function allocatePracticeQuota(payload: AllocateQuotaPayload): Promise<MutationResult<unknown>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.put<MutationResult<unknown>>(
    `/v1/schools/${schoolId}/students/practice-quota`,
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
