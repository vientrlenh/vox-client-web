// src/features/assessment_policy_school/api/useAcceptSchoolAssessmentPolicyImportMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { assessmentPolicyQueryKeys } from './useSchoolAssessmentPoliciesQuery';
import type { AcceptAssessmentPolicyImportRequest, AcceptAssessmentPolicyImportResponse } from '../types';

type AcceptInput = {
  sessionId: string;
  payload: AcceptAssessmentPolicyImportRequest;
};

export function useAcceptSchoolAssessmentPolicyImportMutation(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, payload }: AcceptInput) => {
      if (!schoolId) throw new Error('Không tìm thấy ID trường học');

      const response = await apiClient.post<ApiResponse<AcceptAssessmentPolicyImportResponse>>(
        `/v1/assessment-policies/schools/${schoolId}/import/${sessionId}/accept`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentPolicyQueryKeys.lists() });
    },
  });
}
