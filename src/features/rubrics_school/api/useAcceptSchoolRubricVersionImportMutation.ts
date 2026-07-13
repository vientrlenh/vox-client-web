// src/features/rubrics/api/useAcceptSchoolRubricVersionImportMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { rubricVersionQueryKeys } from './useSchoolRubricVersionsQuery';
import { searchRubricVersionKeys } from './useSearchSchoolRubricVersionsQuery';
import type { AcceptRubricVersionImportRequest, AcceptRubricVersionImportResponse } from '../types';

type AcceptInput = {
  sessionId: string;
  payload: AcceptRubricVersionImportRequest;
};

export function useAcceptSchoolRubricVersionImportMutation(schoolId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, payload }: AcceptInput) => {
      if (!schoolId) throw new Error("Thiếu schoolId");

      const response = await apiClient.post<ApiResponse<AcceptRubricVersionImportResponse>>(
        `/v1/rubrics/schools/${schoolId}/rubrics/versions/import/${sessionId}/accept`,
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
