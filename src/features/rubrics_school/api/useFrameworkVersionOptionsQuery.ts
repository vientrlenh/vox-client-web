// src/features/rubrics_school/api/useFrameworkVersionOptionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { FrameworkCriterionOption, FrameworkVersionOption } from '../types';

// Lưu ý: "frameworkVersions"/"frameworkVersion" chỉ SYSTEM_ADMIN mới gọi được.
// School Admin phải dùng "schoolFrameworkVersions"/"schoolFrameworkVersion"
// (BE tự lọc chỉ trả về bản PUBLISHED nên không cần filter status ở FE nữa).

// 1. Danh sách Framework Version (đã PUBLISHED) theo Framework của Rubric đang xem
const GET_SCHOOL_FRAMEWORK_VERSIONS = `
  query GetSchoolFrameworkVersionsForRubric($frameworkId: ID!, $page: Int, $size: Int) {
    schoolFrameworkVersions(frameworkId: $frameworkId, page: $page, size: $size) {
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
    queryKey: ['school-rubric-framework-versions', frameworkId],
    queryFn: async () => {
      const data = await graphQLRequest<{ schoolFrameworkVersions: { content: FrameworkVersionOption[] } }>(
        GET_SCHOOL_FRAMEWORK_VERSIONS,
        { frameworkId, page: 1, size: 100 }
      );
      return data.schoolFrameworkVersions.content;
    },
    enabled: Boolean(frameworkId),
  });
}

// 2. Danh sách Framework Criterion của một Framework Version cụ thể (dùng cho dropdown chọn Framework Criterion ID)
// BE đã tách thành query gốc riêng "schoolFrameworkCriteria" (chỉ Version đã PUBLISHED) thay vì lồng qua schoolFrameworkVersion.criteria.
const GET_SCHOOL_FRAMEWORK_CRITERIA = `
  query GetSchoolFrameworkCriteria($frameworkVersionId: ID!) {
    schoolFrameworkCriteria(frameworkVersionId: $frameworkVersionId) {
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
    queryKey: ['school-rubric-framework-version-criteria', frameworkVersionId],
    queryFn: async () => {
      const data = await graphQLRequest<{ schoolFrameworkCriteria: FrameworkCriterionOption[] }>(
        GET_SCHOOL_FRAMEWORK_CRITERIA,
        { frameworkVersionId }
      );
      return data.schoolFrameworkCriteria;
    },
    enabled: Boolean(frameworkVersionId),
  });
}
