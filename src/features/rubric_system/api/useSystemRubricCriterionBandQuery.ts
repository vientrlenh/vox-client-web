// src/features/rubric_system/api/useSystemRubricCriterionBandQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricCriterionBand } from '../types';

export const systemRubricCriterionBandKey = (bandId?: string) =>
  ['system-rubric-criterion-band', bandId] as const;

const GET_SYSTEM_RUBRIC_CRITERION_BAND = `
  query ViewSystemRubricCriterionBand($bandId: ID!) {
    viewSystemRubricCriterionBand(bandId: $bandId) {
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

export function useSystemRubricCriterionBandQuery(bandId: string | undefined) {
  return useQuery({
    queryKey: systemRubricCriterionBandKey(bandId),
    queryFn: async () => {
      const data = await graphQLRequest<{ viewSystemRubricCriterionBand: RubricCriterionBand }>(
        GET_SYSTEM_RUBRIC_CRITERION_BAND,
        { bandId }
      );
      return data.viewSystemRubricCriterionBand;
    },
    enabled: Boolean(bandId),
  });
}
