// src/features/rubric_system/api/useSearchSystemRubricCriterionBandsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricCriterionBandPage } from '../types';

export const searchRubricCriterionBandKeys = {
  all: ['search-system-rubric-criterion-bands'] as const,
  lists: () => [...searchRubricCriterionBandKeys.all, 'list'] as const,
  list: (criterionId: string, filter: unknown, page: number, size: number) =>
    [...searchRubricCriterionBandKeys.lists(), criterionId, filter, page, size] as const,
};

const SEARCH_SYSTEM_RUBRIC_CRITERION_BANDS = `
  query SearchSystemRubricCriterionBands($criterionId: ID!, $filter: SearchRubricCriterionBandFilter, $page: Int, $size: Int) {
    searchSystemRubricCriterionBands(criterionId: $criterionId, filter: $filter, page: $page, size: $size) {
      content {
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
      page
      size
      totalElements
      totalPages
    }
  }
`;

export type SearchRubricCriterionBandFilter = {
  keyword?: string | null;
};

async function searchSystemRubricCriterionBands(
  criterionId: string,
  filter: SearchRubricCriterionBandFilter,
  page: number,
  size: number
): Promise<RubricCriterionBandPage> {
  const data = await graphQLRequest<{ searchSystemRubricCriterionBands: RubricCriterionBandPage }>(
    SEARCH_SYSTEM_RUBRIC_CRITERION_BANDS,
    { criterionId, filter, page, size }
  );

  const response = data.searchSystemRubricCriterionBands;

  return {
    ...response,
    page: response.page + 1, // Bù trừ 0-based từ Backend lên 1-based cho Pagination UI
  };
}

export function useSearchSystemRubricCriterionBandsQuery(
  criterionId: string | undefined,
  filter: SearchRubricCriterionBandFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: searchRubricCriterionBandKeys.list(criterionId || '', filter, page, size),
    queryFn: () => searchSystemRubricCriterionBands(criterionId!, filter, page, size),
    enabled: Boolean(criterionId),
    placeholderData: (previousData) => previousData,
  });
}
