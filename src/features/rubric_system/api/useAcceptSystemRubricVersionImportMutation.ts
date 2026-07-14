// src/features/rubric_system/api/useAcceptSystemRubricVersionImportMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { rubricVersionQueryKeys } from './useSystemRubricVersionsQuery';
import { searchRubricVersionKeys } from './useSearchSystemRubricVersionsQuery';
import type { AcceptRubricVersionImportRequest, AcceptRubricVersionImportResponse } from '../types';

type AcceptInput = {
  sessionId: string;
  payload: AcceptRubricVersionImportRequest;
};

export function useAcceptSystemRubricVersionImportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, payload }: AcceptInput) => {
      const response = await apiClient.post<ApiResponse<AcceptRubricVersionImportResponse>>(
        `/v1/rubrics/system/rubrics/versions/import/${sessionId}/accept`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubricVersionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: searchRubricVersionKeys.all });
    },
  });
}
