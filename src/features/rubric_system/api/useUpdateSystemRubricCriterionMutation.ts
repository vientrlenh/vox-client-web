// src/features/rubric_system/api/useUpdateSystemRubricCriterionMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { systemRubricCriterionKey } from './useSystemRubricCriterionQuery';
import { searchRubricCriteriaKeys } from './useSearchSystemRubricCriteriaQuery';

export type UpdateRubricCriterionPayload = {
  name?: string;
  description?: string;
  examplesJson?: string;
  weight?: number;
  minScore?: number;
  maxScore?: number;
  order?: number;
  isRequired?: boolean;
};

const UPDATE_CRITERION = `
  mutation UpdateSystemRubricCriterion($criterionId: ID!, $input: UpdateRubricCriterionInput!) {
    updateSystemRubricCriterion(criterionId: $criterionId, input: $input)
  }
`;

export function useUpdateSystemRubricCriterionMutation(criterionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateRubricCriterionPayload) => {
      if (!criterionId) throw new Error("Thiếu criterionId");

      const res = await graphQLRequest<{ updateSystemRubricCriterion: string }>(UPDATE_CRITERION, {
        criterionId,
        input,
      });
      return res.updateSystemRubricCriterion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemRubricCriterionKey(criterionId) });
      queryClient.invalidateQueries({ queryKey: searchRubricCriteriaKeys.all });
    },
  });
}
