// src/features/rubrics/api/useSchoolRubricVersionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricVersionPage } from '../types';

export const rubricVersionQueryKeys = {
  all: ['rubric-versions'] as const,
  lists: () => [...rubricVersionQueryKeys.all, 'list'] as const,
  list: (schoolId: string, rubricId: string, status: string | undefined, page: number, size: number) =>
    [...rubricVersionQueryKeys.lists(), schoolId, rubricId, status, page, size] as const,
};

const GET_SCHOOL_RUBRIC_VERSIONS = `
  query GetSchoolRubricVersions($schoolId: ID!, $rubricId: ID!, $status: String, $page: Int, $size: Int) {
    viewSchoolRubricVersions(schoolId: $schoolId, rubricId: $rubricId, status: $status, page: $page, size: $size) {
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

async function fetchSchoolRubricVersions(
  schoolId: string,
  rubricId: string,
  status: string | undefined,
  page: number,
  size: number
): Promise<RubricVersionPage> {
  const data = await graphQLRequest<{ viewSchoolRubricVersions: RubricVersionPage }>(
    GET_SCHOOL_RUBRIC_VERSIONS,
    { schoolId, rubricId, status, page, size }
  );

  const response = data.viewSchoolRubricVersions;

  return {
    ...response,
    page: response.page + 1,
  };
}

export function useSchoolRubricVersionsQuery(
  schoolId: string | undefined,
  rubricId: string | undefined,
  page: number,
  size: number,
  status?: string // Có thể truyền "PUBLISHED" nếu chỉ muốn lấy bản đã apply
) {
  return useQuery({
    queryKey: rubricVersionQueryKeys.list(schoolId || '', rubricId || '', status, page, size),
    queryFn: () => fetchSchoolRubricVersions(schoolId!, rubricId!, status, page, size),
    enabled: Boolean(schoolId && rubricId),
  });
}
