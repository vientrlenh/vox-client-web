// src/features/rubrics_school/api/useArchiveSchoolRubricVersionMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { rubricVersionQueryKeys } from './useSchoolRubricVersionsQuery';
import { searchRubricVersionKeys } from './useSearchSchoolRubricVersionsQuery';

export function useArchiveSchoolRubricVersionMutation(schoolId?: string, versionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!schoolId || !versionId) throw new Error("Thiếu schoolId hoặc versionId");

      const response = await apiClient.patch<ApiResponse<string>>(
        `/v1/rubrics/schools/${schoolId}/rubric-versions/${versionId}/archive`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-rubric-version', schoolId, versionId] });
      queryClient.invalidateQueries({ queryKey: rubricVersionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: searchRubricVersionKeys.all });
    },
  });
}
