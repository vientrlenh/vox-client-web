// src/features/rubrics/api/usePreviewSchoolRubricVersionImportMutation.ts

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import type { PreviewRubricVersionImportResponse } from '../types';

export function usePreviewSchoolRubricVersionImportMutation(schoolId?: string, rubricId?: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!schoolId || !rubricId) throw new Error("Thiếu schoolId hoặc rubricId");

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<ApiResponse<PreviewRubricVersionImportResponse>>(
        `/v1/rubrics/schools/${schoolId}/rubrics/${rubricId}/versions/import/preview`,
        formData
      );
      return response.data;
    },
  });
}
