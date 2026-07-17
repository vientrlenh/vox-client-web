// src/features/scoring_rules_system/api/useDeleteSystemScoringRuleMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchSystemScoringRulesKeys } from './useSearchSystemScoringRulesQuery';

export function useDeleteSystemScoringRuleMutation(policyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      if (!policyId || !ruleId) throw new Error('Thiếu policyId hoặc ruleId');

      const response = await apiClient.delete(
        `/v1/assessment-policies/system/${policyId}/scoring-rules/${ruleId}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchSystemScoringRulesKeys.all });
    },
  });
}
