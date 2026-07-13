// src/features/rubric_system/api/useSystemRubricCriterionQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricCriterion } from '../types';

export const systemRubricCriterionKey = (criterionId?: string) =>
  ['system-rubric-criterion', criterionId] as const;

const GET_SYSTEM_RUBRIC_CRITERION = `
  query ViewSystemRubricCriterion($criterionId: ID!) {
    viewSystemRubricCriterion(criterionId: $criterionId) {
      id
      rubricVersionId
      frameworkCriterionId
      code
      name
      description
      examplesJson
      weight
      minScore
      maxScore
      order
      isRequired
      createdAt
      updatedAt
      createdBy
      updatedBy
    }
  }
`;

export function useSystemRubricCriterionQuery(criterionId: string | undefined) {
  return useQuery({
    queryKey: systemRubricCriterionKey(criterionId),
    queryFn: async () => {
      const data = await graphQLRequest<{ viewSystemRubricCriterion: RubricCriterion }>(
        GET_SYSTEM_RUBRIC_CRITERION,
        { criterionId }
      );
      return data.viewSystemRubricCriterion;
    },
    enabled: Boolean(criterionId),
    staleTime: 1000 * 60 * 5,
  });
}
