// src/features/rubrics/api/useUpdateSchoolRubricResultBandMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { schoolRubricResultBandKey } from './useSchoolRubricResultBandQuery';
import { searchRubricResultBandKeys } from './useSearchSchoolRubricResultBandsQuery';

export type UpdateRubricResultBandPayload = {
  name?: string;
  description?: string;
  scoreMin?: number;
  scoreMax?: number;
  order?: number;
};

const UPDATE_RESULT_BAND = `
  mutation UpdateSchoolRubricResultBand($schoolId: ID!, $resultBandId: ID!, $input: UpdateRubricResultBandInput!) {
    updateSchoolRubricResultBand(schoolId: $schoolId, resultBandId: $resultBandId, input: $input)
  }
`;

export function useUpdateSchoolRubricResultBandMutation(schoolId: string | undefined, resultBandId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateRubricResultBandPayload) => {
      if (!schoolId || !resultBandId) throw new Error("Thiếu schoolId hoặc resultBandId");

      const res = await graphQLRequest<{ updateSchoolRubricResultBand: string }>(UPDATE_RESULT_BAND, {
        schoolId,
        resultBandId,
        input,
      });
      return res.updateSchoolRubricResultBand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolRubricResultBandKey(schoolId, resultBandId) });
      queryClient.invalidateQueries({ queryKey: searchRubricResultBandKeys.all });
    },
  });
}
