// src/features/rubrics/api/useDeleteSchoolRubricCriterionBandMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricCriterionBandKeys } from './useSearchSchoolRubricCriterionBandsQuery';

export function useDeleteSchoolRubricCriterionBandMutation(
  schoolId: string | undefined,
  versionId: string | undefined,
  criterionId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bandId: string) => {
      if (!schoolId || !versionId || !criterionId || !bandId) throw new Error("Thiếu thông tin để xóa mức điểm");

      const response = await apiClient.delete(
        `/v1/rubrics/schools/${schoolId}/rubric-versions/${versionId}/criteria/${criterionId}/bands/${bandId}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricCriterionBandKeys.all });
      queryClient.invalidateQueries({ queryKey: ['school-rubric-criterion-band'] });
    },
  });
}
