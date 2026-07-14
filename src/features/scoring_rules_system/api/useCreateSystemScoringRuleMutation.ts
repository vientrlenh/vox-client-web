// src/features/scoring_rules_system/api/useCreateSystemScoringRuleMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchSystemScoringRulesKeys } from './useSearchSystemScoringRulesQuery';

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

export function useCreateSystemScoringRuleMutation(policyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateScoringRulePayload) => {
      if (!policyId) throw new Error('Thiếu policyId');

      const response = await apiClient.post(
        `/v1/assessment-policies/system/${policyId}/scoring-rules`,
        payload
      );

      // ApiResponse<UUID> -> ruleId vừa tạo nằm trong response.data.data
      return response.data.data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchSystemScoringRulesKeys.all });
    },
  });
}
