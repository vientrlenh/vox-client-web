import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/apiClient'
import { schoolQueryKeys } from './useSchoolsQuery'

// Cấu trúc payload gửi lên
type UpdateSchoolStatusPayload = {
  id: string
  isActive: boolean
}

// Cấu trúc response chuẩn từ backend (ApiResponse<SchoolResponse>)
type UpdateSchoolStatusResponse = {
  status: number
  message: string
  data: unknown
}

async function updateSchoolStatus({ id, isActive }: UpdateSchoolStatusPayload) {
  // PATCH /api/v1/schools/{id}/status?isActive={true/false}
  const response = await apiClient.patch<UpdateSchoolStatusResponse>(
    `/v1/schools/${id}/status`,
    null, // Body rỗng vì tham số truyền qua URL Params
    {
      params: { isActive },
    }
  )
  return response.data
}

export function useUpdateSchoolStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateSchoolStatus,
    onSuccess: () => {
      // Khi cập nhật thành công, đánh dấu query danh sách trường là "cũ" (stale)
      // TanStack Query sẽ tự động gọi lại API lấy danh sách mới nhất và cập nhật UI.
      void queryClient.invalidateQueries({
        queryKey: schoolQueryKeys.all,
      })
    },
  })
}