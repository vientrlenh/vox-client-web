// src/features/assessment_policy_system/api/useCreateSystemAssessmentPolicyMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { assessmentPolicyQueryKeys } from './useSystemAssessmentPoliciesQuery';
import type { CreateAssessmentPolicyPayload } from '../types';

export function useCreateSystemAssessmentPolicyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payloads: CreateAssessmentPolicyPayload[]) => {
      // BE nhận vào 1 mảng CreateSystemAssessmentPolicyRequest (cho phép tạo nhiều Policy
      // cùng lúc), mỗi request chứa đúng 1 rubricVersionId -> 1 Policy / rubric version.
      const response = await apiClient.post('/v1/assessment-policies/system', payloads);

      // ApiResponse<List<UUID>> -> danh sách policyId vừa tạo nằm trong response.data.data
      return response.data.data as string[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentPolicyQueryKeys.lists() });
    },
  });
}
