// src/features/assessment_policy_school/api/useCloneSystemAssessmentPolicyMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { rubricQueryKeys } from '@/features/rubrics_school/api/useSchoolRubricsQuery';
import { searchRubricKeys } from '@/features/rubrics_school/api/useSearchSchoolRubricsQuery';
import { rubricVersionQueryKeys } from '@/features/rubrics_school/api/useSchoolRubricVersionsQuery';
import { assessmentPolicyQueryKeys } from './useSchoolAssessmentPoliciesQuery';

export type CloneSystemAssessmentPolicyPayload = {
  sourcePolicyId: string;
  /** Mã/tên do TRƯỜNG đặt cho bản sao rubric đi kèm. */
  rubricCode: string;
  rubricName: string;
  rubricDescription?: string;
  /** Bỏ trống thì giữ nguyên cách tính của bản mẫu. */
  totalScoreMethod?: string;
  // Chỉ điền khi bản mẫu KHÔNG gắn Khối; khi đó phải chọn đúng 1 trong 3.
  gradeLevelId?: string;
  schoolGradeId?: string;
  schoolClassId?: string;
  effectiveFrom: string;
  effectiveTo?: string;
};

/**
 * Sao một chính sách chấm mẫu của hệ thống về trường.
 *
 * Một lần gọi tạo ra HAI thứ: một bản sao bộ tiêu chí (vì rubric của bản mẫu thuộc sở hữu SYSTEM,
 * mà chính sách của trường chỉ gắn được vào rubric của chính trường đó) và một chính sách mới trỏ
 * vào bản sao ấy. Cả hai đều ra ở trạng thái nháp.
 *
 * Vì vậy phải dọn cache của cả hai họ: danh sách chính sách của trường, và danh sách rubric (cả
 * đường xem lẫn đường tìm kiếm) kèm danh sách phiên bản.
 */
export function useCloneSystemAssessmentPolicyMutation(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CloneSystemAssessmentPolicyPayload): Promise<string> => {
      if (!schoolId) throw new Error('Không tìm thấy ID trường học');

      const response = await apiClient.post(
        `/v1/assessment-policies/schools/${schoolId}/clone-from-system`,
        payload
      );

      // Theo ApiResponse<UUID> của BE, id chính sách mới nằm ở response.data.data
      return response.data.data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentPolicyQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: rubricQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: searchRubricKeys.all });
      queryClient.invalidateQueries({ queryKey: rubricVersionQueryKeys.all });
    },
  });
}
