// src/features/assessment_policy_system/api/usePreviewSystemAssessmentPolicyImportMutation.ts

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import type { PreviewAssessmentPolicyImportResponse } from '../types';

export function usePreviewSystemAssessmentPolicyImportMutation() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<ApiResponse<PreviewAssessmentPolicyImportResponse>>(
        '/v1/assessment-policies/system/import/preview',
        formData
      );
      return response.data;
    },
  });
}
