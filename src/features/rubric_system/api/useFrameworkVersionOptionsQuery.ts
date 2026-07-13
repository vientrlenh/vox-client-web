// src/features/rubric_system/api/useFrameworkVersionOptionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { FrameworkCriterionOption, FrameworkVersionOption } from '../types';

// Lưu ý: System Admin dùng "frameworkVersions"/"frameworkCriteria" (không có tiền tố "school"),
// query này KHÔNG giới hạn trạng thái Version (trả về cả DRAFT/PUBLISHED/ARCHIVED).

// 1. Danh sách Framework Version theo Framework của Rubric đang xem
const GET_FRAMEWORK_VERSIONS = `
  query GetFrameworkVersionsForRubric($frameworkId: ID!, $page: Int, $size: Int) {
    frameworkVersions(frameworkId: $frameworkId, page: $page, size: $size) {
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

export function useFrameworkVersionsQuery(frameworkId?: string) {
  return useQuery({
    queryKey: ['system-rubric-framework-versions', frameworkId],
    queryFn: async () => {
      const data = await graphQLRequest<{ frameworkVersions: { content: FrameworkVersionOption[] } }>(
        GET_FRAMEWORK_VERSIONS,
        { frameworkId, page: 1, size: 100 }
      );
      return data.frameworkVersions.content;
    },
    enabled: Boolean(frameworkId),
  });
}

// 2. Danh sách Framework Criterion của một Framework Version cụ thể (dùng cho dropdown chọn Framework Criterion ID)
const GET_FRAMEWORK_CRITERIA = `
  query GetFrameworkCriteria($frameworkVersionId: ID!) {
    frameworkCriteria(frameworkVersionId: $frameworkVersionId) {
      id
      code
      name
      description
      order
    }
  }
`;

export function useFrameworkVersionCriteriaQuery(frameworkVersionId?: string) {
  return useQuery({
    queryKey: ['system-rubric-framework-version-criteria', frameworkVersionId],
    queryFn: async () => {
      const data = await graphQLRequest<{ frameworkCriteria: FrameworkCriterionOption[] }>(
        GET_FRAMEWORK_CRITERIA,
        { frameworkVersionId }
      );
      return data.frameworkCriteria;
    },
    enabled: Boolean(frameworkVersionId),
  });
}
