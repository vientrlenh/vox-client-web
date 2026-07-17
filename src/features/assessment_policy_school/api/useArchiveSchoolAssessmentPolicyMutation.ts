// src/features/assessment_policy_school/api/useArchiveSchoolAssessmentPolicyMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { assessmentPolicyQueryKeys } from './useSchoolAssessmentPoliciesQuery';
import { assessmentPolicyDetailQueryKeys } from './useSchoolAssessmentPolicyQuery';

export function useArchiveSchoolAssessmentPolicyMutation(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policyId: string) => {
      if (!schoolId) throw new Error('Không tìm thấy ID trường học');
      if (!policyId) throw new Error('Thiếu policyId');

      const response = await apiClient.patch<ApiResponse<string>>(
        `/v1/assessment-policies/schools/${schoolId}/${policyId}/archive`
      );
      return response.data.data as string;
    },
    onSuccess: (_data, policyId) => {
      queryClient.invalidateQueries({ queryKey: assessmentPolicyQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assessmentPolicyDetailQueryKeys.detail(schoolId || '', policyId) });
    },
  });
}
