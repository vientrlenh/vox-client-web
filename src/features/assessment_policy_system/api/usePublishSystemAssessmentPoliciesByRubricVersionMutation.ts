// src/features/assessment_policy_system/api/usePublishSystemAssessmentPoliciesByRubricVersionMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { assessmentPolicyQueryKeys } from './useSystemAssessmentPoliciesQuery';

export function usePublishSystemAssessmentPoliciesByRubricVersionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rubricVersionId: string) => {
      if (!rubricVersionId) throw new Error('Thiếu rubricVersionId');

      const response = await apiClient.patch<ApiResponse<string[]>>(
        `/v1/assessment-policies/system/rubric-version/${rubricVersionId}/publish-all`
      );
      return response.data.data as string[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentPolicyQueryKeys.lists() });
    },
  });
}
