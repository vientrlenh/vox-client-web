// src/features/assessment_policy_school/api/usePublishSchoolAssessmentPoliciesByRubricVersionMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { assessmentPolicyQueryKeys } from './useSchoolAssessmentPoliciesQuery';

export function usePublishSchoolAssessmentPoliciesByRubricVersionMutation(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rubricVersionId: string) => {
      if (!schoolId) throw new Error('Không tìm thấy ID trường học');
      if (!rubricVersionId) throw new Error('Thiếu rubricVersionId');

      const response = await apiClient.patch<ApiResponse<string[]>>(
        `/v1/assessment-policies/schools/${schoolId}/rubric-version/${rubricVersionId}/publish-all`
      );
      return response.data.data as string[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentPolicyQueryKeys.lists() });
    },
  });
}
