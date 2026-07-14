// src/features/rubric_system/api/useDeleteSystemRubricVersionMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { rubricVersionQueryKeys } from './useSystemRubricVersionsQuery';
import { searchRubricVersionKeys } from './useSearchSystemRubricVersionsQuery';

export function useDeleteSystemRubricVersionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      if (!versionId) throw new Error("Thiếu thông tin versionId");

      // apiClient đã có sẵn baseURL (bao gồm /api) và tự đính kèm Authorization token
      const response = await apiClient.delete(
        `/v1/rubrics/system/rubric-versions/${versionId}`
      );

      return response.data;
    },
    onSuccess: () => {
      // Clear cache danh sách versions để nó tự động biến mất khỏi UI
      queryClient.invalidateQueries({ queryKey: rubricVersionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: searchRubricVersionKeys.all });
      // Clear cache của chính cái version vừa xóa để dọn rác
      queryClient.invalidateQueries({ queryKey: ['system-rubric-version'] });
    },
  });
}
