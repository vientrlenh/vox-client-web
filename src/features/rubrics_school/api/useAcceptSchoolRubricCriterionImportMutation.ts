// src/features/rubrics/api/useAcceptSchoolRubricCriterionImportMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricCriteriaKeys } from './useSearchSchoolRubricCriteriaQuery';
import type { AcceptRubricCriterionImportRequest, AcceptRubricCriterionImportResponse } from '../types';

type AcceptInput = {
  sessionId: string;
  payload: AcceptRubricCriterionImportRequest;
};

export function useAcceptSchoolRubricCriterionImportMutation(schoolId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, payload }: AcceptInput) => {
      if (!schoolId) throw new Error("Thiếu schoolId");

      const response = await apiClient.post<AcceptRubricCriterionImportResponse>(
        `/v1/rubrics/schools/${schoolId}/rubric-versions/import-sessions/${sessionId}/accept`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricCriteriaKeys.all });
    },
  });
}
