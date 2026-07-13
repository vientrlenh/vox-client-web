// src/features/rubrics/api/useDeleteSchoolRubricCriterionMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricCriteriaKeys } from './useSearchSchoolRubricCriteriaQuery';

export function useDeleteSchoolRubricCriterionMutation(schoolId: string | undefined, versionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (criterionId: string) => {
      if (!schoolId || !versionId || !criterionId) throw new Error("Thiếu thông tin schoolId, versionId hoặc criterionId");

      const response = await apiClient.delete(
        `/v1/rubrics/schools/${schoolId}/rubric-versions/${versionId}/criteria/${criterionId}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricCriteriaKeys.all });
      queryClient.invalidateQueries({ queryKey: ['school-rubric-criterion'] });
    },
  });
}
