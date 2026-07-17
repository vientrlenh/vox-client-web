// src/features/rubrics/api/useAcceptSchoolRubricResultBandImportMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricResultBandKeys } from './useSearchSchoolRubricResultBandsQuery';
import type { AcceptRubricResultBandImportRequest, AcceptRubricResultBandImportResponse } from '../types';

type AcceptInput = {
  sessionId: string;
  payload: AcceptRubricResultBandImportRequest;
};

export function useAcceptSchoolRubricResultBandImportMutation(schoolId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, payload }: AcceptInput) => {
      if (!schoolId) throw new Error("Thiếu schoolId");

      const response = await apiClient.post<AcceptRubricResultBandImportResponse>(
        `/v1/rubrics/school/${schoolId}/rubric-versions/result-bands/import/${sessionId}/accept`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricResultBandKeys.all });
    },
  });
}
