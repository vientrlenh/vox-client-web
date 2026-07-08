// src/features/scoring_rules_school/api/useDeleteSchoolScoringRuleMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchSchoolScoringRulesKeys } from './useSearchSchoolScoringRulesQuery';

export function useDeleteSchoolScoringRuleMutation(schoolId: string | undefined, policyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      if (!schoolId || !policyId || !ruleId) throw new Error('Thiếu schoolId, policyId hoặc ruleId');

      const response = await apiClient.delete(
        `/v1/assessment-policies/schools/${schoolId}/${policyId}/scoring-rules/${ruleId}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchSchoolScoringRulesKeys.all });
    },
  });
}
