// src/features/rubrics/api/useSchoolRubricCriterionQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricCriterion } from '../types';

export const schoolRubricCriterionKey = (schoolId?: string, criterionId?: string) =>
  ['school-rubric-criterion', schoolId, criterionId] as const;

const GET_SCHOOL_RUBRIC_CRITERION = `
  query ViewSchoolRubricCriterion($schoolId: ID!, $criterionId: ID!) {
    viewSchoolRubricCriterion(schoolId: $schoolId, criterionId: $criterionId) {
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

export function useSchoolRubricCriterionQuery(schoolId: string | undefined, criterionId: string | undefined) {
  return useQuery({
    queryKey: schoolRubricCriterionKey(schoolId, criterionId),
    queryFn: async () => {
      const data = await graphQLRequest<{ viewSchoolRubricCriterion: RubricCriterion }>(
        GET_SCHOOL_RUBRIC_CRITERION,
        { schoolId, criterionId }
      );
      return data.viewSchoolRubricCriterion;
    },
    enabled: Boolean(schoolId && criterionId),
    staleTime: 1000 * 60 * 5,
  });
}
