// src/features/rubrics/api/useSearchSchoolRubricResultBandsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricResultBandPage } from '../types';

export const searchRubricResultBandKeys = {
  all: ['search-school-rubric-result-bands'] as const,
  lists: () => [...searchRubricResultBandKeys.all, 'list'] as const,
  list: (schoolId: string, versionId: string, filter: unknown, page: number, size: number) =>
    [...searchRubricResultBandKeys.lists(), schoolId, versionId, filter, page, size] as const,
};

const SEARCH_SCHOOL_RUBRIC_RESULT_BANDS = `
  query SearchSchoolRubricResultBands($schoolId: ID!, $versionId: ID!, $filter: SearchRubricResultBandFilter, $page: Int, $size: Int) {
    searchSchoolRubricResultBands(schoolId: $schoolId, versionId: $versionId, filter: $filter, page: $page, size: $size) {
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

async function searchSchoolRubricResultBands(
  schoolId: string,
  versionId: string,
  filter: SearchRubricResultBandFilter,
  page: number,
  size: number
): Promise<RubricResultBandPage> {
  const data = await graphQLRequest<{ searchSchoolRubricResultBands: RubricResultBandPage }>(
    SEARCH_SCHOOL_RUBRIC_RESULT_BANDS,
    { schoolId, versionId, filter, page, size }
  );

  const response = data.searchSchoolRubricResultBands;

  return {
    ...response,
    page: response.page + 1, // Bù trừ 0-based từ Backend lên 1-based cho Pagination UI
  };
}

export function useSearchSchoolRubricResultBandsQuery(
  schoolId: string | undefined,
  versionId: string | undefined,
  filter: SearchRubricResultBandFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: searchRubricResultBandKeys.list(schoolId || '', versionId || '', filter, page, size),
    queryFn: () => searchSchoolRubricResultBands(schoolId!, versionId!, filter, page, size),
    enabled: Boolean(schoolId && versionId),
    placeholderData: (previousData) => previousData,
  });
}
