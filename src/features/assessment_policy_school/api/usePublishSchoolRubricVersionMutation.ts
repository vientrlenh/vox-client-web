// src/features/assessment_policy_school/api/usePublishSchoolRubricVersionMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ApiResponse } from '@/shared/api';
import { assessmentPolicyQueryKeys } from './useSchoolAssessmentPoliciesQuery';

// Dùng riêng cho dialog Rubric Version bên Assessment Policy: chuyển RubricVersion từ DRAFT -> PUBLISHED
// sau khi đã xuất bản hết các Assessment Policy DRAFT liên kết với nó.
export function usePublishSchoolRubricVersionMutation(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rubricVersionId: string) => {
      if (!schoolId) throw new Error('Không tìm thấy ID trường học');
      if (!rubricVersionId) throw new Error('Thiếu rubricVersionId');

      const response = await apiClient.patch<ApiResponse<string>>(
        `/v1/rubrics/schools/${schoolId}/rubric-versions/${rubricVersionId}/status`,
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
