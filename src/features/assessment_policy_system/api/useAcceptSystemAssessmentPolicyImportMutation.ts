// src/features/assessment_policy_system/api/useAcceptSystemAssessmentPolicyImportMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { assessmentPolicyQueryKeys } from './useSystemAssessmentPoliciesQuery';
import type { AcceptAssessmentPolicyImportRequest, AcceptAssessmentPolicyImportResponse } from '../types';

type AcceptInput = {
  sessionId: string;
  payload: AcceptAssessmentPolicyImportRequest;
};

export function useAcceptSystemAssessmentPolicyImportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, payload }: AcceptInput) => {
      const response = await apiClient.post<ApiResponse<AcceptAssessmentPolicyImportResponse>>(
        `/v1/assessment-policies/system/import/${sessionId}/accept`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentPolicyQueryKeys.lists() });
    },
  });
}
