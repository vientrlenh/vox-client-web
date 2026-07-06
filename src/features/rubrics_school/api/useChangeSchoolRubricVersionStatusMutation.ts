// src/features/rubrics/api/useChangeSchoolRubricVersionStatusMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { rubricVersionQueryKeys } from './useSchoolRubricVersionsQuery';
import { searchRubricVersionKeys } from './useSearchSchoolRubricVersionsQuery';

export function useChangeSchoolRubricVersionStatusMutation(schoolId?: string, versionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: string) => {
      if (!schoolId || !versionId) throw new Error("Thiếu schoolId hoặc versionId");

      const response = await apiClient.patch<ApiResponse<string>>(
        `/v1/rubrics/schools/${schoolId}/rubric-versions/${versionId}/status`,
        null,
        { params: { status } }
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
