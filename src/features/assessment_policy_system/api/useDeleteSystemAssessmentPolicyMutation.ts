// src/features/assessment_policy_system/api/useDeleteSystemAssessmentPolicyMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { assessmentPolicyQueryKeys } from './useSystemAssessmentPoliciesQuery';

export function useDeleteSystemAssessmentPolicyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policyId: string) => {
      if (!policyId) throw new Error('Thiếu policyId');

      const response = await apiClient.delete(`/v1/assessment-policies/system/${policyId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentPolicyQueryKeys.lists() });
    },
  });
}
