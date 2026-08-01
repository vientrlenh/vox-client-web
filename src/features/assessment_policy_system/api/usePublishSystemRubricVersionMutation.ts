// src/features/assessment_policy_system/api/usePublishSystemRubricVersionMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { assessmentPolicyQueryKeys } from './useSystemAssessmentPoliciesQuery';

// Dùng riêng cho dialog Rubric Version bên Assessment Policy: chuyển RubricVersion từ DRAFT -> PUBLISHED
// sau khi đã xuất bản hết các Assessment Policy DRAFT liên kết với nó.
export function usePublishSystemRubricVersionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rubricVersionId: string) => {
      if (!rubricVersionId) throw new Error('Thiếu rubricVersionId');

      const response = await apiClient.patch<ApiResponse<string>>(
        `/v1/rubrics/system/rubric-versions/${rubricVersionId}/status`,
        null,
        { params: { status: 'PUBLISHED' } }
      );
      return response.data.data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentPolicyQueryKeys.lists() });
    },
  });
}
