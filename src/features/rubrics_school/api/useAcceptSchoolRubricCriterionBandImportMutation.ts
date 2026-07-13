// src/features/rubrics/api/useAcceptSchoolRubricCriterionBandImportMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricCriterionBandKeys } from './useSearchSchoolRubricCriterionBandsQuery';
import type { AcceptRubricCriterionBandImportRequest, AcceptRubricCriterionBandImportResponse } from '../types';

type AcceptInput = {
  sessionId: string;
  payload: AcceptRubricCriterionBandImportRequest;
};

export function useAcceptSchoolRubricCriterionBandImportMutation(schoolId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, payload }: AcceptInput) => {
      if (!schoolId) throw new Error("Thiếu schoolId");

      const response = await apiClient.post<AcceptRubricCriterionBandImportResponse>(
        `/v1/rubrics/schools/${schoolId}/rubric-criterions/bands/import/${sessionId}/accept`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricCriterionBandKeys.all });
    },
  });
}
