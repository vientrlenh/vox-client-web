// src/features/rubrics/api/useSearchSchoolRubricsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricPage } from '../types';

export const searchRubricKeys = {
  all: ['search-school-rubrics'] as const,
  lists: () => [...searchRubricKeys.all, 'list'] as const,
  list: (schoolId: string, filter: unknown, page: number, size: number) =>
    [...searchRubricKeys.lists(), schoolId, filter, page, size] as const,
};

const SEARCH_SCHOOL_RUBRICS = `
  query SearchSchoolRubrics($schoolId: ID!, $filter: SearchRubricFilter, $page: Int, $size: Int) {
    searchSchoolRubrics(schoolId: $schoolId, filter: $filter, page: $page, size: $size) {
      content {
        id
        code
        name
        description
        languageId
        frameworkId
        ownerType
        language {
          name
        }
        framework {
          name
        }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`;

export type SearchRubricFilter = {
  keyword?: string | null;
  frameworkId?: string | null;
  languageId?: string | null;
};

async function searchSchoolRubrics(
  schoolId: string,
  filter: SearchRubricFilter,
  page: number,
  size: number
): Promise<RubricPage> {
  const data = await graphQLRequest<{ searchSchoolRubrics: RubricPage }>(
    SEARCH_SCHOOL_RUBRICS,
    { schoolId, filter, page, size }
  );

  const response = data.searchSchoolRubrics;
  return {
    ...response,
    page: response.page + 1, // Bù trừ 0-based từ Backend lên 1-based cho Pagination UI
  };
}

export function useSearchSchoolRubricsQuery(
  schoolId: string | undefined,
  filter: SearchRubricFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: searchRubricKeys.list(schoolId || '', filter, page, size),
    queryFn: () => searchSchoolRubrics(schoolId!, filter, page, size),
    enabled: Boolean(schoolId),
    placeholderData: (previousData) => previousData, // Giữ data cũ trong lúc loading search mới cho mượt
  });
}