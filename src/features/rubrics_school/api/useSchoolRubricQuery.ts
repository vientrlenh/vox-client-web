// src/features/rubrics/api/useSchoolRubricQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { rubricQueryKeys } from './useSchoolRubricsQuery';
import type { Rubric } from '../types';

// Thêm key cho màn chi tiết
export const rubricDetailKey = (schoolId: string, rubricId: string) => 
  [...rubricQueryKeys.all, 'detail', schoolId, rubricId] as const;

const GET_SCHOOL_RUBRIC = `
  query GetSchoolRubric($schoolId: ID!, $id: ID!) {
    viewSchoolRubric(schoolId: $schoolId, id: $id) {
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
  }
`;

async function fetchSchoolRubric(schoolId: string, id: string): Promise<Rubric | null> {
  const data = await graphQLRequest<{ viewSchoolRubric: Rubric | null }>(
    GET_SCHOOL_RUBRIC,
    { schoolId, id }
  );
  return data.viewSchoolRubric;
}

export function useSchoolRubricQuery(schoolId: string | undefined, rubricId: string | undefined) {
  return useQuery({
    queryKey: rubricDetailKey(schoolId || '', rubricId || ''),
    queryFn: () => fetchSchoolRubric(schoolId!, rubricId!),
    enabled: Boolean(schoolId && rubricId), // Chỉ gọi khi có đủ 2 ID
  });
}