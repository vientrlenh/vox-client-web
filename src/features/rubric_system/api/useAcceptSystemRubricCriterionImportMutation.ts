// src/features/rubric_system/api/useAcceptSystemRubricCriterionImportMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { searchRubricCriteriaKeys } from './useSearchSystemRubricCriteriaQuery';
import type { AcceptRubricCriterionImportRequest, AcceptRubricCriterionImportResponse } from '../types';

type AcceptInput = {
  sessionId: string;
  payload: AcceptRubricCriterionImportRequest;
};

export function useAcceptSystemRubricCriterionImportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, payload }: AcceptInput) => {
      const response = await apiClient.post<ApiResponse<AcceptRubricCriterionImportResponse>>(
        `/v1/rubrics/system/rubrics/criterions/import/${sessionId}/accept`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricCriteriaKeys.all });
    },
  });
}
