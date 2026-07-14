// src/features/rubrics/api/useSearchSchoolRubricCriterionBandsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricCriterionBandPage } from '../types';

export const searchRubricCriterionBandKeys = {
  all: ['search-school-rubric-criterion-bands'] as const,
  lists: () => [...searchRubricCriterionBandKeys.all, 'list'] as const,
  list: (schoolId: string, criterionId: string, filter: unknown, page: number, size: number) =>
    [...searchRubricCriterionBandKeys.lists(), schoolId, criterionId, filter, page, size] as const,
};

const SEARCH_SCHOOL_RUBRIC_CRITERION_BANDS = `
  query SearchSchoolRubricCriterionBands($schoolId: ID!, $criterionId: ID!, $filter: SearchRubricCriterionBandFilter, $page: Int, $size: Int) {
    searchSchoolRubricCriterionBands(schoolId: $schoolId, criterionId: $criterionId, filter: $filter, page: $page, size: $size) {
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

async function searchSchoolRubricCriterionBands(
  schoolId: string,
  criterionId: string,
  filter: SearchRubricCriterionBandFilter,
  page: number,
  size: number
): Promise<RubricCriterionBandPage> {
  const data = await graphQLRequest<{ searchSchoolRubricCriterionBands: RubricCriterionBandPage }>(
    SEARCH_SCHOOL_RUBRIC_CRITERION_BANDS,
    { schoolId, criterionId, filter, page, size }
  );

  const response = data.searchSchoolRubricCriterionBands;

  return {
    ...response,
    page: response.page + 1, // Bù trừ 0-based từ Backend lên 1-based cho Pagination UI
  };
}

export function useSearchSchoolRubricCriterionBandsQuery(
  schoolId: string | undefined,
  criterionId: string | undefined,
  filter: SearchRubricCriterionBandFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: searchRubricCriterionBandKeys.list(schoolId || '', criterionId || '', filter, page, size),
    queryFn: () => searchSchoolRubricCriterionBands(schoolId!, criterionId!, filter, page, size),
    enabled: Boolean(schoolId && criterionId),
    placeholderData: (previousData) => previousData,
  });
}
