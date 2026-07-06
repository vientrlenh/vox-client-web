// src/features/rubric_system/api/useUpdateSystemRubricResultBandMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { systemRubricResultBandKey } from './useSystemRubricResultBandQuery';
import { searchRubricResultBandKeys } from './useSearchSystemRubricResultBandsQuery';

export type UpdateRubricResultBandPayload = {
  name?: string;
  description?: string;
  scoreMin?: number;
  scoreMax?: number;
  order?: number;
};

const UPDATE_RESULT_BAND = `
  mutation UpdateSystemRubricResultBand($resultBandId: ID!, $input: UpdateRubricResultBandInput!) {
    updateSystemRubricResultBand(resultBandId: $resultBandId, input: $input)
  }
`;

export function useUpdateSystemRubricResultBandMutation(resultBandId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateRubricResultBandPayload) => {
      if (!resultBandId) throw new Error("Thiếu resultBandId");

      const res = await graphQLRequest<{ updateSystemRubricResultBand: string }>(UPDATE_RESULT_BAND, {
        resultBandId,
        input,
      });
      return res.updateSystemRubricResultBand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemRubricResultBandKey(resultBandId) });
      queryClient.invalidateQueries({ queryKey: searchRubricResultBandKeys.all });
    },
  });
}
