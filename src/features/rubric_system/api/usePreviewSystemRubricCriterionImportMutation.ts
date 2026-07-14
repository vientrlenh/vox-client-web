// src/features/rubric_system/api/usePreviewSystemRubricCriterionImportMutation.ts

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import type { PreviewRubricCriterionImportResponse } from '../types';

export function usePreviewSystemRubricCriterionImportMutation(versionId?: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!versionId) throw new Error("Thiếu versionId");

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<ApiResponse<PreviewRubricCriterionImportResponse>>(
        `/v1/rubrics/system/rubrics/versions/${versionId}/criterions/import/preview`,
        formData
      );
      return response.data;
    },
  });
}
