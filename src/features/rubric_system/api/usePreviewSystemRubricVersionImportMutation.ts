// src/features/rubric_system/api/usePreviewSystemRubricVersionImportMutation.ts

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import type { PreviewRubricVersionImportResponse } from '../types';

export function usePreviewSystemRubricVersionImportMutation(rubricId?: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!rubricId) throw new Error("Thiếu rubricId");

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<ApiResponse<PreviewRubricVersionImportResponse>>(
        `/v1/rubrics/system/rubrics/${rubricId}/versions/import/preview`,
        formData
      );
      return response.data;
    },
  });
}
