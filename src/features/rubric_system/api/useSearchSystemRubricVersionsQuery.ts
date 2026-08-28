// src/features/rubric_system/api/useSearchSystemRubricVersionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricVersionPage } from '../types';

export const searchRubricVersionKeys = {
  all: ['search-system-rubric-versions'] as const,
  lists: () => [...searchRubricVersionKeys.all, 'list'] as const,
  list: (rubricId: string, filter: unknown, page: number, size: number) =>
    [...searchRubricVersionKeys.lists(), rubricId, filter, page, size] as const,
};

const SEARCH_SYSTEM_RUBRIC_VERSIONS = `
  query SearchSystemRubricVersions($rubricId: ID!, $filter: SearchRubricVersionFilter, $page: Int, $size: Int) {
    searchSystemRubricVersions(rubricId: $rubricId, filter: $filter, page: $page, size: $size) {
      content {
        id
        rubricId
        version
        code
        name
        description
        status
        effectiveFrom
        effectiveTo
        scoringScaleMin
        scoringScaleMax
        totalScoreMethod
      }
      page
      size
      totalElements
      totalPages
    }
  }
`;

export type SearchRubricVersionFilter = {
  keyword?: string | null;
  status?: string | null;
};

async function searchSystemRubricVersions(
  rubricId: string,
  filter: SearchRubricVersionFilter,
  page: number,
  size: number
): Promise<RubricVersionPage> {
  const data = await graphQLRequest<{ searchSystemRubricVersions: RubricVersionPage }>(
    SEARCH_SYSTEM_RUBRIC_VERSIONS,
    { rubricId, filter, page, size }
  );

  const response = data.searchSystemRubricVersions;

  return response;
}

export function useSearchSystemRubricVersionsQuery(
  rubricId: string | undefined,
  filter: SearchRubricVersionFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: searchRubricVersionKeys.list(rubricId || '', filter, page, size),
    queryFn: () => searchSystemRubricVersions(rubricId!, filter, page, size),
    enabled: Boolean(rubricId),
    placeholderData: (previousData) => previousData, // Giữ data cũ trong lúc loading search mới cho mượt
  });
}
