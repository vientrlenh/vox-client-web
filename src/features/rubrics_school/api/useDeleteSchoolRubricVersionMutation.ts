// src/features/rubrics/api/useDeleteSchoolRubricVersionMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { rubricVersionQueryKeys } from './useSchoolRubricVersionsQuery';
import { searchRubricVersionKeys } from './useSearchSchoolRubricVersionsQuery';

export function useDeleteSchoolRubricVersionMutation(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      if (!schoolId || !versionId) throw new Error("Thiếu thông tin schoolId hoặc versionId");

      // apiClient đã có sẵn baseURL (bao gồm /api) và tự đính kèm Authorization token
      const response = await apiClient.delete(
        `/v1/rubrics/schools/${schoolId}/rubric-versions/${versionId}`
      );

      return response.data;
    },
    onSuccess: () => {
      // Clear cache danh sách versions để nó tự động biến mất khỏi UI
      queryClient.invalidateQueries({ queryKey: rubricVersionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: searchRubricVersionKeys.all });
      // Clear cache của chính cái version vừa xóa để dọn rác
      queryClient.invalidateQueries({ queryKey: ['school-rubric-version'] });
    },
  });
}