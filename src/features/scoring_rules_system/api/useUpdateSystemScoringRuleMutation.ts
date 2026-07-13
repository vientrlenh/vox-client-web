// src/features/scoring_rules_system/api/useUpdateSystemScoringRuleMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { searchSystemScoringRulesKeys } from './useSearchSystemScoringRulesQuery';

// Khớp với UpdateScoringRuleInput (GraphQL): conditionParamsJson/actionParamsJson là chuỗi JSON
// (khác với Create dùng Map thô), cấu trúc bên trong phải khớp conditionType/actionType đã chọn.
export type UpdateScoringRulePayload = {
  name: string;
  description?: string;
  conditionType: string;
  conditionParamsJson: string;
  actionType: string;
  actionParamsJson: string;
  priority: number;
  severity: string;
  stopProcessing: boolean;
  isActive: boolean;
};

const UPDATE_SYSTEM_SCORING_RULE = `
  mutation UpdateSystemScoringRule($policyId: ID!, $ruleId: ID!, $input: UpdateScoringRuleInput!) {
    updateSystemScoringRule(policyId: $policyId, ruleId: $ruleId, input: $input)
  }
`;

export function useUpdateSystemScoringRuleMutation(
  policyId: string | undefined,
  ruleId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateScoringRulePayload) => {
      if (!policyId || !ruleId) throw new Error('Thiếu policyId hoặc ruleId');

      const res = await graphQLRequest<{ updateSystemScoringRule: string }>(UPDATE_SYSTEM_SCORING_RULE, {
        policyId,
        ruleId,
        input,
      });
      return res.updateSystemScoringRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchSystemScoringRulesKeys.all });
    },
  });
}
