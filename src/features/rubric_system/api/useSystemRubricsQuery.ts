// src/features/rubric_system/api/useSystemRubricsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricPage } from '../types';

export const rubricQueryKeys = {
  all: ['system-rubrics'] as const,
  lists: () => [...rubricQueryKeys.all, 'list'] as const,
  list: (page: number, size: number) =>
    [...rubricQueryKeys.lists(), page, size] as const,
};

const GET_SYSTEM_RUBRICS = `
  query GetSystemRubrics($page: Int, $size: Int) {
    viewSystemRubrics(page: $page, size: $size) {
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

async function fetchSystemRubrics(page: number, size: number): Promise<RubricPage> {
  const data = await graphQLRequest<{ viewSystemRubrics: RubricPage }>(
    GET_SYSTEM_RUBRICS,
    { page, size }
  );

  const response = data.viewSystemRubrics;

  return {
    ...response,
    page: response.page + 1
  };
}

export function useSystemRubricsQuery(page: number, size: number) {
  return useQuery({
    queryKey: rubricQueryKeys.list(page, size),
    queryFn: () => fetchSystemRubrics(page, size),
  });
}
