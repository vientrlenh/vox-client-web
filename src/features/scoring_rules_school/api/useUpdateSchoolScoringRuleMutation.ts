// src/features/scoring_rules_school/api/useUpdateSchoolScoringRuleMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { searchSchoolScoringRulesKeys } from './useSearchSchoolScoringRulesQuery';

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

const UPDATE_SCHOOL_SCORING_RULE = `
  mutation UpdateSchoolScoringRule($schoolId: ID!, $policyId: ID!, $ruleId: ID!, $input: UpdateScoringRuleInput!) {
    updateSchoolScoringRule(schoolId: $schoolId, policyId: $policyId, ruleId: $ruleId, input: $input)
  }
`;

export function useUpdateSchoolScoringRuleMutation(
  schoolId: string | undefined,
  policyId: string | undefined,
  ruleId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateScoringRulePayload) => {
      if (!schoolId || !policyId || !ruleId) throw new Error('Thiếu schoolId, policyId hoặc ruleId');

      const res = await graphQLRequest<{ updateSchoolScoringRule: string }>(UPDATE_SCHOOL_SCORING_RULE, {
        schoolId,
        policyId,
        ruleId,
        input,
      });
      return res.updateSchoolScoringRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchSchoolScoringRulesKeys.all });
    },
  });
}
