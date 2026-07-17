// src/features/rubrics/api/useAddSchoolRubricResultBandsMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricResultBandKeys } from './useSearchSchoolRubricResultBandsQuery';

export type RubricResultBandItemRequest = {
  code: string;
  name: string;
  description?: string;
  scoreMin: number;
  scoreMax: number;
  order: number;
};

export type AddRubricResultBandsPayload = {
  resultBands: RubricResultBandItemRequest[];
};

export function useAddSchoolRubricResultBandsMutation(schoolId?: string, versionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddRubricResultBandsPayload) => {
      if (!schoolId || !versionId) throw new Error("Thiếu schoolId hoặc versionId");

      const response = await apiClient.post(
        `/v1/rubrics/schools/${schoolId}/rubric-versions/${versionId}/result-bands`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricResultBandKeys.all });
    },
  });
}
