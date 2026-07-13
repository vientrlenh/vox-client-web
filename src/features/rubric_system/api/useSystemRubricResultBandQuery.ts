// src/features/rubric_system/api/useSystemRubricResultBandQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricResultBand } from '../types';

export const systemRubricResultBandKey = (resultBandId?: string) =>
  ['system-rubric-result-band', resultBandId] as const;

const GET_SYSTEM_RUBRIC_RESULT_BAND = `
  query ViewSystemRubricResultBand($resultBandId: ID!) {
    viewSystemRubricResultBand(resultBandId: $resultBandId) {
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

export function useSystemRubricResultBandQuery(resultBandId: string | undefined) {
  return useQuery({
    queryKey: systemRubricResultBandKey(resultBandId),
    queryFn: async () => {
      const data = await graphQLRequest<{ viewSystemRubricResultBand: RubricResultBand }>(
        GET_SYSTEM_RUBRIC_RESULT_BAND,
        { resultBandId }
      );
      return data.viewSystemRubricResultBand;
    },
    enabled: Boolean(resultBandId),
  });
}
