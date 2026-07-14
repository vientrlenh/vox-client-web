// src/features/rubric_system/api/useAcceptSystemRubricCriterionBandImportMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { searchRubricCriterionBandKeys } from './useSearchSystemRubricCriterionBandsQuery';
import type { AcceptRubricCriterionBandImportRequest, AcceptRubricCriterionBandImportResponse } from '../types';

type AcceptInput = {
  sessionId: string;
  payload: AcceptRubricCriterionBandImportRequest;
};

export function useAcceptSystemRubricCriterionBandImportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, payload }: AcceptInput) => {
      const response = await apiClient.post<ApiResponse<AcceptRubricCriterionBandImportResponse>>(
        `/v1/rubrics/system/rubrics/criterions/bands/import/${sessionId}/accept`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricCriterionBandKeys.all });
    },
  });
}
