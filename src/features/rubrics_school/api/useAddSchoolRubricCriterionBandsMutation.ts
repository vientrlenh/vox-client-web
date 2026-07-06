// src/features/rubrics/api/useAddSchoolRubricCriterionBandsMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricCriterionBandKeys } from './useSearchSchoolRubricCriterionBandsQuery';

export type RubricCriterionBandItemRequest = {
  code: string;
  scoreMin: number;
  scoreMax: number;
};

export type AddRubricCriterionBandsPayload = {
  bands: RubricCriterionBandItemRequest[];
};

export function useAddSchoolRubricCriterionBandsMutation(schoolId?: string, versionId?: string, criterionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddRubricCriterionBandsPayload) => {
      if (!schoolId || !versionId || !criterionId) throw new Error("Thiếu schoolId, versionId hoặc criterionId");

      const response = await apiClient.post(
        `/v1/rubrics/schools/${schoolId}/rubric-versions/${versionId}/criteria/${criterionId}/bands`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricCriterionBandKeys.all });
    },
  });
}
