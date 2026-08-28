// src/features/rubric_system/api/useSearchSystemRubricCriteriaQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricCriterionPage } from '../types';

export const searchRubricCriteriaKeys = {
  all: ['search-system-rubric-criteria'] as const,
  lists: () => [...searchRubricCriteriaKeys.all, 'list'] as const,
  list: (versionId: string, filter: unknown, page: number, size: number) =>
    [...searchRubricCriteriaKeys.lists(), versionId, filter, page, size] as const,
};

const SEARCH_SYSTEM_RUBRIC_CRITERIA = `
  query SearchSystemRubricCriteria($versionId: ID!, $filter: SearchRubricCriterionFilter, $page: Int, $size: Int) {
    searchSystemRubricCriteria(versionId: $versionId, filter: $filter, page: $page, size: $size) {
      content {
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
      page
      size
      totalElements
      totalPages
    }
  }
`;

export type SearchRubricCriterionFilter = {
  keyword?: string | null;
  isRequired?: boolean | null;
};

async function searchSystemRubricCriteria(
  versionId: string,
  filter: SearchRubricCriterionFilter,
  page: number,
  size: number
): Promise<RubricCriterionPage> {
  const data = await graphQLRequest<{ searchSystemRubricCriteria: RubricCriterionPage }>(
    SEARCH_SYSTEM_RUBRIC_CRITERIA,
    { versionId, filter, page, size }
  );

  const response = data.searchSystemRubricCriteria;

  return response;
}

export function useSearchSystemRubricCriteriaQuery(
  versionId: string | undefined,
  filter: SearchRubricCriterionFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: searchRubricCriteriaKeys.list(versionId || '', filter, page, size),
    queryFn: () => searchSystemRubricCriteria(versionId!, filter, page, size),
    enabled: Boolean(versionId),
    placeholderData: (previousData) => previousData,
  });
}
