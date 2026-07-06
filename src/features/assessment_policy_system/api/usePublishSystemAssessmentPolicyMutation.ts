// src/features/assessment_policy_system/api/usePublishSystemAssessmentPolicyMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { assessmentPolicyQueryKeys } from './useSystemAssessmentPoliciesQuery';
import { assessmentPolicyDetailQueryKeys } from './useSystemAssessmentPolicyQuery';

export function usePublishSystemAssessmentPolicyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policyId: string) => {
      if (!policyId) throw new Error('Thiếu policyId');

      const response = await apiClient.patch<ApiResponse<string>>(
        `/v1/assessment-policies/system/${policyId}/publish`
      );
      return response.data.data as string;
    },
    onSuccess: (_data, policyId) => {
      queryClient.invalidateQueries({ queryKey: assessmentPolicyQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assessmentPolicyDetailQueryKeys.detail(policyId) });
    },
  });
}
