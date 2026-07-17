// src/features/assessment_policy_system/api/useRubricOptionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricOption, RubricVersionOption } from '../types';

// 1. Danh sách Rubric để chọn, lọc theo ngôn ngữ đã chọn ở form
const SEARCH_RUBRICS_FOR_POLICY = `
  query SearchRubricsForPolicy($filter: SearchRubricFilter, $page: Int, $size: Int) {
    searchSystemRubrics(filter: $filter, page: $page, size: $size) {
      content {
        id
        code
        name
        frameworkId
        languageId
      }
    }
  }
`;

export function useRubricSearchOptionsQuery(languageId?: string) {
  return useQuery({
    queryKey: ['assessment-policy-rubric-options', languageId],
    queryFn: async () => {
      const data = await graphQLRequest<{ searchSystemRubrics: { content: RubricOption[] } }>(
        SEARCH_RUBRICS_FOR_POLICY,
        { filter: { languageId: languageId || null }, page: 1, size: 100 }
      );
      return data.searchSystemRubrics.content;
    },
    enabled: Boolean(languageId),
  });
}

// 2. Danh sách Rubric Version theo Rubric đã chọn (cho phép cả DRAFT lẫn PUBLISHED)
const GET_RUBRIC_VERSIONS_FOR_POLICY = `
  query GetRubricVersionsForPolicy($rubricId: ID!, $page: Int, $size: Int) {
    viewSystemRubricVersions(rubricId: $rubricId, page: $page, size: $size) {
      content {
        id
        code
        name
        version
        status
      }
    }
  }
`;

export function useRubricVersionOptionsQuery(rubricId?: string) {
  return useQuery({
    queryKey: ['assessment-policy-rubric-version-options', rubricId],
    queryFn: async () => {
      const data = await graphQLRequest<{ viewSystemRubricVersions: { content: RubricVersionOption[] } }>(
        GET_RUBRIC_VERSIONS_FOR_POLICY,
        { rubricId, page: 1, size: 100 }
      );
      return data.viewSystemRubricVersions.content;
    },
    enabled: Boolean(rubricId),
  });
}
