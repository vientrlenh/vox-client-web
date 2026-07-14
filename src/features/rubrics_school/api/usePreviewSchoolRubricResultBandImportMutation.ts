// src/features/rubrics/api/usePreviewSchoolRubricResultBandImportMutation.ts

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { PreviewRubricResultBandImportResponse } from '../types';

export function usePreviewSchoolRubricResultBandImportMutation(schoolId?: string, versionId?: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!schoolId || !versionId) throw new Error("Thiếu schoolId hoặc versionId");

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<PreviewRubricResultBandImportResponse>(
        `/v1/rubrics/school/${schoolId}/rubric-versions/${versionId}/result-bands/import/preview`,
        formData
      );
      return response.data;
    },
  });
}
