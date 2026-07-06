// src/features/rubrics/api/useUpdateSchoolRubricCriterionBandMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { schoolRubricCriterionBandKey } from './useSchoolRubricCriterionBandQuery';
import { searchRubricCriterionBandKeys } from './useSearchSchoolRubricCriterionBandsQuery';

export type UpdateRubricCriterionBandPayload = {
  scoreMin?: number;
  scoreMax?: number;
};

const UPDATE_CRITERION_BAND = `
  mutation UpdateSchoolRubricCriterionBand($schoolId: ID!, $bandId: ID!, $input: UpdateRubricCriterionBandInput!) {
    updateSchoolRubricCriterionBand(schoolId: $schoolId, bandId: $bandId, input: $input)
  }
`;

export function useUpdateSchoolRubricCriterionBandMutation(schoolId: string | undefined, bandId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateRubricCriterionBandPayload) => {
      if (!schoolId || !bandId) throw new Error("Thiếu schoolId hoặc bandId");

      const res = await graphQLRequest<{ updateSchoolRubricCriterionBand: string }>(UPDATE_CRITERION_BAND, {
        schoolId,
        bandId,
        input,
      });
      return res.updateSchoolRubricCriterionBand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolRubricCriterionBandKey(schoolId, bandId) });
      queryClient.invalidateQueries({ queryKey: searchRubricCriterionBandKeys.all });
    },
  });
}
