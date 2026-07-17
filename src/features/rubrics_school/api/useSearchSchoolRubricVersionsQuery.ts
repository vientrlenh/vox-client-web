// src/features/rubrics/api/useSearchSchoolRubricVersionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricVersionPage } from '../types';

export const searchRubricVersionKeys = {
  all: ['search-school-rubric-versions'] as const,
  lists: () => [...searchRubricVersionKeys.all, 'list'] as const,
  list: (schoolId: string, rubricId: string, filter: unknown, page: number, size: number) =>
    [...searchRubricVersionKeys.lists(), schoolId, rubricId, filter, page, size] as const,
};

const SEARCH_SCHOOL_RUBRIC_VERSIONS = `
  query SearchSchoolRubricVersions($schoolId: ID!, $rubricId: ID!, $filter: SearchRubricVersionFilter, $page: Int, $size: Int) {
    searchSchoolRubricVersions(schoolId: $schoolId, rubricId: $rubricId, filter: $filter, page: $page, size: $size) {
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

async function searchSchoolRubricVersions(
  schoolId: string,
  rubricId: string,
  filter: SearchRubricVersionFilter,
  page: number,
  size: number
): Promise<RubricVersionPage> {
  const data = await graphQLRequest<{ searchSchoolRubricVersions: RubricVersionPage }>(
    SEARCH_SCHOOL_RUBRIC_VERSIONS,
    { schoolId, rubricId, filter, page, size }
  );

  const response = data.searchSchoolRubricVersions;

  return {
    ...response,
    page: response.page + 1, // Bù trừ 0-based từ Backend lên 1-based cho Pagination UI
  };
}

export function useSearchSchoolRubricVersionsQuery(
  schoolId: string | undefined,
  rubricId: string | undefined,
  filter: SearchRubricVersionFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: searchRubricVersionKeys.list(schoolId || '', rubricId || '', filter, page, size),
    queryFn: () => searchSchoolRubricVersions(schoolId!, rubricId!, filter, page, size),
    enabled: Boolean(schoolId && rubricId),
    placeholderData: (previousData) => previousData, // Giữ data cũ trong lúc loading search mới cho mượt
  });
}
