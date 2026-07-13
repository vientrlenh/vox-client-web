// src/features/rubrics/api/usePreviewSchoolRubricCriterionBandImportMutation.ts

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { PreviewRubricCriterionBandImportResponse } from '../types';

export function usePreviewSchoolRubricCriterionBandImportMutation(schoolId?: string, criterionId?: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!schoolId || !criterionId) throw new Error("Thiếu schoolId hoặc criterionId");

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<PreviewRubricCriterionBandImportResponse>(
        `/v1/rubrics/schools/${schoolId}/rubric-criterions/${criterionId}/bands/import/preview`,
        formData
      );
      return response.data;
    },
  });
}
