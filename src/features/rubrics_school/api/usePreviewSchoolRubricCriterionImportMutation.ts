// src/features/rubrics/api/usePreviewSchoolRubricCriterionImportMutation.ts

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { PreviewRubricCriterionImportResponse } from '../types';

export function usePreviewSchoolRubricCriterionImportMutation(schoolId?: string, versionId?: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!schoolId || !versionId) throw new Error("Thiếu schoolId hoặc versionId");

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<PreviewRubricCriterionImportResponse>(
        `/v1/rubrics/schools/${schoolId}/rubric-versions/${versionId}/criterions/import/preview`,
        formData
      );
      return response.data;
    },
  });
}
