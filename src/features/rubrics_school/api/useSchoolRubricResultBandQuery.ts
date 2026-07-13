// src/features/rubrics/api/useSchoolRubricResultBandQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricResultBand } from '../types';

export const schoolRubricResultBandKey = (schoolId?: string, resultBandId?: string) =>
  ['school-rubric-result-band', schoolId, resultBandId] as const;

const GET_SCHOOL_RUBRIC_RESULT_BAND = `
  query ViewSchoolRubricResultBand($schoolId: ID!, $resultBandId: ID!) {
    viewSchoolRubricResultBand(schoolId: $schoolId, resultBandId: $resultBandId) {
      id
      rubricVersionId
      code
      name
      description
      scoreMin
      scoreMax
      order
      createdAt
      updatedAt
      createdBy
      updatedBy
    }
  }
`;

export function useSchoolRubricResultBandQuery(schoolId: string | undefined, resultBandId: string | undefined) {
  return useQuery({
    queryKey: schoolRubricResultBandKey(schoolId, resultBandId),
    queryFn: async () => {
      const data = await graphQLRequest<{ viewSchoolRubricResultBand: RubricResultBand }>(
        GET_SCHOOL_RUBRIC_RESULT_BAND,
        { schoolId, resultBandId }
      );
      return data.viewSchoolRubricResultBand;
    },
    enabled: Boolean(schoolId && resultBandId),
  });
}
