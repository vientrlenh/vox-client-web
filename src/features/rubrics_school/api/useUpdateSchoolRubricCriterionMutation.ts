// src/features/rubrics/api/useUpdateSchoolRubricCriterionMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { schoolRubricCriterionKey } from './useSchoolRubricCriterionQuery';
import { searchRubricCriteriaKeys } from './useSearchSchoolRubricCriteriaQuery';

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
  mutation UpdateSchoolRubricCriterion($schoolId: ID!, $criterionId: ID!, $input: UpdateRubricCriterionInput!) {
    updateSchoolRubricCriterion(schoolId: $schoolId, criterionId: $criterionId, input: $input)
  }
`;

export function useUpdateSchoolRubricCriterionMutation(schoolId: string | undefined, criterionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateRubricCriterionPayload) => {
      if (!schoolId || !criterionId) throw new Error("Thiếu schoolId hoặc criterionId");

      const res = await graphQLRequest<{ updateSchoolRubricCriterion: string }>(UPDATE_CRITERION, {
        schoolId,
        criterionId,
        input,
      });
      return res.updateSchoolRubricCriterion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolRubricCriterionKey(schoolId, criterionId) });
      queryClient.invalidateQueries({ queryKey: searchRubricCriteriaKeys.all });
    },
  });
}
