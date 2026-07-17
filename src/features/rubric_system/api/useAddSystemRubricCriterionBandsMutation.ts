// src/features/rubric_system/api/useAddSystemRubricCriterionBandsMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricCriterionBandKeys } from './useSearchSystemRubricCriterionBandsQuery';

export type RubricCriterionBandItemRequest = {
  code: string;
  scoreMin: number;
  scoreMax: number;
};

export type AddRubricCriterionBandsPayload = {
  bands: RubricCriterionBandItemRequest[];
};

export function useAddSystemRubricCriterionBandsMutation(versionId?: string, criterionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddRubricCriterionBandsPayload) => {
      if (!versionId || !criterionId) throw new Error("Thiếu versionId hoặc criterionId");

      const response = await apiClient.post(
        `/v1/rubrics/system/rubric-versions/${versionId}/criteria/${criterionId}/bands`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricCriterionBandKeys.all });
    },
  });
}
