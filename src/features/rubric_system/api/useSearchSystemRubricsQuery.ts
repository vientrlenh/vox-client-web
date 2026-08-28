// src/features/rubric_system/api/useSearchSystemRubricsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricPage } from '../types';

export const searchRubricKeys = {
  all: ['search-system-rubrics'] as const,
  lists: () => [...searchRubricKeys.all, 'list'] as const,
  list: (filter: unknown, page: number, size: number) =>
    [...searchRubricKeys.lists(), filter, page, size] as const,
};

const SEARCH_SYSTEM_RUBRICS = `
  query SearchSystemRubrics($filter: SearchRubricFilter, $page: Int, $size: Int) {
    searchSystemRubrics(filter: $filter, page: $page, size: $size) {
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

async function searchSystemRubrics(
  filter: SearchRubricFilter,
  page: number,
  size: number
): Promise<RubricPage> {
  const data = await graphQLRequest<{ searchSystemRubrics: RubricPage }>(
    SEARCH_SYSTEM_RUBRICS,
    { filter, page, size }
  );

  const response = data.searchSystemRubrics;
  return response;
}

export function useSearchSystemRubricsQuery(
  filter: SearchRubricFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: searchRubricKeys.list(filter, page, size),
    queryFn: () => searchSystemRubrics(filter, page, size),
    placeholderData: (previousData) => previousData, // Giữ data cũ trong lúc loading search mới cho mượt
  });
}
