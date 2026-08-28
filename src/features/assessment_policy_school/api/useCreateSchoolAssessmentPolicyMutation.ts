// src/features/assessment_policy_school/api/useCreateSchoolAssessmentPolicyMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { assessmentPolicyQueryKeys } from './useSchoolAssessmentPoliciesQuery';
import type { CreateAssessmentPolicyPayload } from '../types';

export function useCreateSchoolAssessmentPolicyMutation(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payloads: CreateAssessmentPolicyPayload[]) => {
      if (!schoolId) throw new Error('Không tìm thấy ID trường học');

      // BE nhận vào 1 mảng CreateSchoolAssessmentPolicyRequest (cho phép tạo nhiều Policy
      // cùng lúc), mỗi request chứa đúng 1 rubricVersionId.
      const response = await apiClient.post(`/v1/assessment-policies/schools/${schoolId}`, payloads);

      // ApiResponse<List<UUID>> -> danh sách policyId vừa tạo nằm trong response.data.data
      return response.data.data as string[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentPolicyQueryKeys.lists() });
    },
  });
}
