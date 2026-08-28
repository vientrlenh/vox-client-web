// src/features/rubrics/api/useSchoolRubricsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricPage } from '../types';

export const rubricQueryKeys = {
  all: ['rubrics'] as const,
  lists: () => [...rubricQueryKeys.all, 'list'] as const,
  list: (schoolId: string, page: number, size: number) =>
    [...rubricQueryKeys.lists(), schoolId, page, size] as const,
};

// ĐÃ CẬP NHẬT: Thêm language { name } và framework { name }
const GET_SCHOOL_RUBRICS = `
  query GetSchoolRubrics($schoolId: ID!, $page: Int, $size: Int) {
    viewSchoolRubrics(schoolId: $schoolId, page: $page, size: $size) {
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

async function fetchSchoolRubrics(schoolId: string, page: number, size: number): Promise<RubricPage> {
  const data = await graphQLRequest<{ viewSchoolRubrics: RubricPage }>(
    GET_SCHOOL_RUBRICS,
    { schoolId, page, size } 
  );
  
  const response = data.viewSchoolRubrics;
  
  return response;
}

export function useSchoolRubricsQuery(schoolId: string | undefined, page: number, size: number) {
  return useQuery({
    queryKey: rubricQueryKeys.list(schoolId || '', page, size),
    queryFn: () => fetchSchoolRubrics(schoolId!, page, size),
    enabled: Boolean(schoolId),
  });
}