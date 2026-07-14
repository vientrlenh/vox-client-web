// src/features/rubrics/api/useSearchSchoolRubricCriteriaQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricCriterionPage } from '../types';

export const searchRubricCriteriaKeys = {
  all: ['search-school-rubric-criteria'] as const,
  lists: () => [...searchRubricCriteriaKeys.all, 'list'] as const,
  list: (schoolId: string, versionId: string, filter: unknown, page: number, size: number) =>
    [...searchRubricCriteriaKeys.lists(), schoolId, versionId, filter, page, size] as const,
};

const SEARCH_SCHOOL_RUBRIC_CRITERIA = `
  query SearchSchoolRubricCriteria($schoolId: ID!, $versionId: ID!, $filter: SearchRubricCriterionFilter, $page: Int, $size: Int) {
    searchSchoolRubricCriteria(schoolId: $schoolId, versionId: $versionId, filter: $filter, page: $page, size: $size) {
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

async function searchSchoolRubricCriteria(
  schoolId: string,
  versionId: string,
  filter: SearchRubricCriterionFilter,
  page: number,
  size: number
): Promise<RubricCriterionPage> {
  const data = await graphQLRequest<{ searchSchoolRubricCriteria: RubricCriterionPage }>(
    SEARCH_SCHOOL_RUBRIC_CRITERIA,
    { schoolId, versionId, filter, page, size }
  );

  const response = data.searchSchoolRubricCriteria;

  return {
    ...response,
    page: response.page + 1, // Bù trừ 0-based từ Backend lên 1-based cho Pagination UI
  };
}

export function useSearchSchoolRubricCriteriaQuery(
  schoolId: string | undefined,
  versionId: string | undefined,
  filter: SearchRubricCriterionFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: searchRubricCriteriaKeys.list(schoolId || '', versionId || '', filter, page, size),
    queryFn: () => searchSchoolRubricCriteria(schoolId!, versionId!, filter, page, size),
    enabled: Boolean(schoolId && versionId),
    placeholderData: (previousData) => previousData,
  });
}
