// src/features/rubric_system/api/useSearchSystemRubricResultBandsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricResultBandPage } from '../types';

export const searchRubricResultBandKeys = {
  all: ['search-system-rubric-result-bands'] as const,
  lists: () => [...searchRubricResultBandKeys.all, 'list'] as const,
  list: (versionId: string, filter: unknown, page: number, size: number) =>
    [...searchRubricResultBandKeys.lists(), versionId, filter, page, size] as const,
};

const SEARCH_SYSTEM_RUBRIC_RESULT_BANDS = `
  query SearchSystemRubricResultBands($versionId: ID!, $filter: SearchRubricResultBandFilter, $page: Int, $size: Int) {
    searchSystemRubricResultBands(versionId: $versionId, filter: $filter, page: $page, size: $size) {
      content {
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
      page
      size
      totalElements
      totalPages
    }
  }
`;

export type SearchRubricResultBandFilter = {
  keyword?: string | null;
};

async function searchSystemRubricResultBands(
  versionId: string,
  filter: SearchRubricResultBandFilter,
  page: number,
  size: number
): Promise<RubricResultBandPage> {
  const data = await graphQLRequest<{ searchSystemRubricResultBands: RubricResultBandPage }>(
    SEARCH_SYSTEM_RUBRIC_RESULT_BANDS,
    { versionId, filter, page, size }
  );

  const response = data.searchSystemRubricResultBands;

  return response;
}

export function useSearchSystemRubricResultBandsQuery(
  versionId: string | undefined,
  filter: SearchRubricResultBandFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: searchRubricResultBandKeys.list(versionId || '', filter, page, size),
    queryFn: () => searchSystemRubricResultBands(versionId!, filter, page, size),
    enabled: Boolean(versionId),
    placeholderData: (previousData) => previousData,
  });
}
