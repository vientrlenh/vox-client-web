// src/features/rubrics/api/useSchoolRubricCriterionBandQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricCriterionBand } from '../types';

export const schoolRubricCriterionBandKey = (schoolId?: string, bandId?: string) =>
  ['school-rubric-criterion-band', schoolId, bandId] as const;

const GET_SCHOOL_RUBRIC_CRITERION_BAND = `
  query ViewSchoolRubricCriterionBand($schoolId: ID!, $bandId: ID!) {
    viewSchoolRubricCriterionBand(schoolId: $schoolId, bandId: $bandId) {
      id
      criterionId
      code
      scoreMin
      scoreMax
      createdAt
      updatedAt
      createdBy
      updatedBy
    }
  }
`;

export function useSchoolRubricCriterionBandQuery(schoolId: string | undefined, bandId: string | undefined) {
  return useQuery({
    queryKey: schoolRubricCriterionBandKey(schoolId, bandId),
    queryFn: async () => {
      const data = await graphQLRequest<{ viewSchoolRubricCriterionBand: RubricCriterionBand }>(
        GET_SCHOOL_RUBRIC_CRITERION_BAND,
        { schoolId, bandId }
      );
      return data.viewSchoolRubricCriterionBand;
    },
    enabled: Boolean(schoolId && bandId),
  });
}
