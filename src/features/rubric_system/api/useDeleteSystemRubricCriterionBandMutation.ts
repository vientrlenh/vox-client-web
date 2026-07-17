// src/features/rubric_system/api/useDeleteSystemRubricCriterionBandMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricCriterionBandKeys } from './useSearchSystemRubricCriterionBandsQuery';

export function useDeleteSystemRubricCriterionBandMutation(
  versionId: string | undefined,
  criterionId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bandId: string) => {
      if (!versionId || !criterionId || !bandId) throw new Error("Thiếu thông tin để xóa mức điểm");

      const response = await apiClient.delete(
        `/v1/rubrics/system/rubric-versions/${versionId}/criteria/${criterionId}/bands/${bandId}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricCriterionBandKeys.all });
      queryClient.invalidateQueries({ queryKey: ['system-rubric-criterion-band'] });
    },
  });
}
