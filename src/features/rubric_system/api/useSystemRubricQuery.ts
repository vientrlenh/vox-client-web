// src/features/rubric_system/api/useSystemRubricQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { rubricQueryKeys } from './useSystemRubricsQuery';
import type { Rubric } from '../types';

// Thêm key cho màn chi tiết
export const rubricDetailKey = (rubricId: string) =>
  [...rubricQueryKeys.all, 'detail', rubricId] as const;

const GET_SYSTEM_RUBRIC = `
  query GetSystemRubric($id: ID!) {
    viewSystemRubric(id: $id) {
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

async function fetchSystemRubric(id: string): Promise<Rubric | null> {
  const data = await graphQLRequest<{ viewSystemRubric: Rubric | null }>(
    GET_SYSTEM_RUBRIC,
    { id }
  );
  return data.viewSystemRubric;
}

export function useSystemRubricQuery(rubricId: string | undefined) {
  return useQuery({
    queryKey: rubricDetailKey(rubricId || ''),
    queryFn: () => fetchSystemRubric(rubricId!),
    enabled: Boolean(rubricId),
  });
}
