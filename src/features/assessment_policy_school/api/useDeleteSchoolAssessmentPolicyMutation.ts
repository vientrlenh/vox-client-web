// src/features/assessment_policy_school/api/useDeleteSchoolAssessmentPolicyMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { assessmentPolicyQueryKeys } from './useSchoolAssessmentPoliciesQuery';

export function useDeleteSchoolAssessmentPolicyMutation(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policyId: string) => {
      if (!schoolId) throw new Error('Không tìm thấy ID trường học');
      if (!policyId) throw new Error('Thiếu policyId');

      const response = await apiClient.delete(`/v1/assessment-policies/schools/${schoolId}/${policyId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentPolicyQueryKeys.lists() });
    },
  });
}
