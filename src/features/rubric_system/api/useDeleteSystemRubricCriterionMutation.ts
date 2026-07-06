// src/features/rubric_system/api/useDeleteSystemRubricCriterionMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricCriteriaKeys } from './useSearchSystemRubricCriteriaQuery';

export function useDeleteSystemRubricCriterionMutation(versionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (criterionId: string) => {
      if (!versionId || !criterionId) throw new Error("Thiếu thông tin versionId hoặc criterionId");

      const response = await apiClient.delete(
        `/v1/rubrics/system/rubric-versions/${versionId}/criteria/${criterionId}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricCriteriaKeys.all });
      queryClient.invalidateQueries({ queryKey: ['system-rubric-criterion'] });
    },
  });
}
