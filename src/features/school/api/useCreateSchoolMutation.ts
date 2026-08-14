import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { schoolDirectoryManagementQueryKeys } from '@/features/school-directory/api/useSchoolDirectoriesQuery'
import { schoolQueryKeys } from './useSchoolsQuery'
import type { CreateSchoolRequest } from '../types'

// ApiResponse<UUID> của backend: `data` là id trường vừa tạo.
type CreateSchoolResponse = {
  data: string
  message: string
  status: number
}

async function createSchool(payload: CreateSchoolRequest) {
  const response = await apiClient.post<CreateSchoolResponse>(
    '/v1/schools',
    payload,
  )
  return response.data
}

export function useCreateSchoolMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: schoolQueryKeys.all })
      // Tạo trường từ một danh mục chưa xác minh sẽ tự xác minh danh mục đó
      // (CreateSchoolUseCase.resolveSchoolInfo), nên trang Danh mục trường cũng phải nạp lại —
      // nếu không nó vẫn hiện "Chưa xác minh" cho tới lần refetch kế tiếp.
      void queryClient.invalidateQueries({
        queryKey: schoolDirectoryManagementQueryKeys.all,
      })
    },
  })
}
