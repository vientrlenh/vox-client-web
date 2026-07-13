// src/features/scoring_rules_school/api/useCreateSchoolScoringRuleMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchSchoolScoringRulesKeys } from './useSearchSchoolScoringRulesQuery';

// Khớp với CreateScoringRuleRequest (BE): conditionParams/actionParams là Map<String,Object> thô,
// cấu trúc phải khớp với conditionType/actionType đã chọn.
export type CreateScoringRulePayload = {
  code: string;
  name: string;
  description?: string;
  conditionType: string;
  conditionParams: Record<string, unknown>;
  actionType: string;
  actionParams: Record<string, unknown>;
  priority: number;
  severity: string;
  stopProcessing: boolean;
  isActive: boolean;
};

export function useCreateSchoolScoringRuleMutation(schoolId: string | undefined, policyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateScoringRulePayload) => {
      if (!schoolId || !policyId) throw new Error('Thiếu schoolId hoặc policyId');

      const response = await apiClient.post(
        `/v1/assessment-policies/schools/${schoolId}/${policyId}/scoring-rules`,
        payload
      );

      // ApiResponse<UUID> -> ruleId vừa tạo nằm trong response.data.data
      return response.data.data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchSchoolScoringRulesKeys.all });
    },
  });
}
