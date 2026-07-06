// src/features/rubric_system/api/useSystemRubricVersionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricVersionPage } from '../types';

export const rubricVersionQueryKeys = {
  all: ['system-rubric-versions'] as const,
  lists: () => [...rubricVersionQueryKeys.all, 'list'] as const,
  list: (rubricId: string, status: string | undefined, page: number, size: number) =>
    [...rubricVersionQueryKeys.lists(), rubricId, status, page, size] as const,
};

const GET_SYSTEM_RUBRIC_VERSIONS = `
  query GetSystemRubricVersions($rubricId: ID!, $status: String, $page: Int, $size: Int) {
    viewSystemRubricVersions(rubricId: $rubricId, status: $status, page: $page, size: $size) {
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

async function fetchSystemRubricVersions(
  rubricId: string,
  status: string | undefined,
  page: number,
  size: number
): Promise<RubricVersionPage> {
  const data = await graphQLRequest<{ viewSystemRubricVersions: RubricVersionPage }>(
    GET_SYSTEM_RUBRIC_VERSIONS,
    { rubricId, status, page, size }
  );

  const response = data.viewSystemRubricVersions;

  return {
    ...response,
    page: response.page + 1,
  };
}

export function useSystemRubricVersionsQuery(
  rubricId: string | undefined,
  page: number,
  size: number,
  status?: string // Có thể truyền "PUBLISHED" nếu chỉ muốn lấy bản đã apply
) {
  return useQuery({
    queryKey: rubricVersionQueryKeys.list(rubricId || '', status, page, size),
    queryFn: () => fetchSystemRubricVersions(rubricId!, status, page, size),
    enabled: Boolean(rubricId),
  });
}
