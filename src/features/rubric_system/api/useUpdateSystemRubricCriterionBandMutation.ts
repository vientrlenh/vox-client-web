// src/features/rubric_system/api/useUpdateSystemRubricCriterionBandMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { systemRubricCriterionBandKey } from './useSystemRubricCriterionBandQuery';
import { searchRubricCriterionBandKeys } from './useSearchSystemRubricCriterionBandsQuery';

export type UpdateRubricCriterionBandPayload = {
  scoreMin?: number;
  scoreMax?: number;
};

const UPDATE_CRITERION_BAND = `
  mutation UpdateSystemRubricCriterionBand($bandId: ID!, $input: UpdateRubricCriterionBandInput!) {
    updateSystemRubricCriterionBand(bandId: $bandId, input: $input)
  }
`;

export function useUpdateSystemRubricCriterionBandMutation(bandId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateRubricCriterionBandPayload) => {
      if (!bandId) throw new Error("Thiếu bandId");

      const res = await graphQLRequest<{ updateSystemRubricCriterionBand: string }>(UPDATE_CRITERION_BAND, {
        bandId,
        input,
      });
      return res.updateSystemRubricCriterionBand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemRubricCriterionBandKey(bandId) });
      queryClient.invalidateQueries({ queryKey: searchRubricCriterionBandKeys.all });
    },
  });
}
