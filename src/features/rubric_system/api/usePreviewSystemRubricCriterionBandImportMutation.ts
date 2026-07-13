// src/features/rubric_system/api/usePreviewSystemRubricCriterionBandImportMutation.ts

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import type { PreviewRubricCriterionBandImportResponse } from '../types';

export function usePreviewSystemRubricCriterionBandImportMutation(criterionId?: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!criterionId) throw new Error("Thiếu criterionId");

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<ApiResponse<PreviewRubricCriterionBandImportResponse>>(
        `/v1/rubrics/system/rubrics/criterions/${criterionId}/bands/import/preview`,
        formData
      );
      return response.data;
    },
  });
}
