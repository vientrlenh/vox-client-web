// src/features/rubric_system/api/useChangeSystemRubricVersionStatusMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { rubricVersionQueryKeys } from './useSystemRubricVersionsQuery';
import { searchRubricVersionKeys } from './useSearchSystemRubricVersionsQuery';

export function useChangeSystemRubricVersionStatusMutation(versionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: string) => {
      if (!versionId) throw new Error("Thiếu versionId");

      const response = await apiClient.patch<ApiResponse<string>>(
        `/v1/rubrics/system/rubric-versions/${versionId}/status`,
        null,
        { params: { status } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-rubric-version', versionId] });
      queryClient.invalidateQueries({ queryKey: rubricVersionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: searchRubricVersionKeys.all });
    },
  });
}
