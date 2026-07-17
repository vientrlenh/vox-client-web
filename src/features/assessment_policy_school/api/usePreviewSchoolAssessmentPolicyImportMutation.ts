// src/features/assessment_policy_school/api/usePreviewSchoolAssessmentPolicyImportMutation.ts

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import type { PreviewAssessmentPolicyImportResponse } from '../types';

export function usePreviewSchoolAssessmentPolicyImportMutation(schoolId: string | undefined) {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!schoolId) throw new Error('Không tìm thấy ID trường học');

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<ApiResponse<PreviewAssessmentPolicyImportResponse>>(
        `/v1/assessment-policies/schools/${schoolId}/import/preview`,
        formData
      );
      return response.data;
    },
  });
}
