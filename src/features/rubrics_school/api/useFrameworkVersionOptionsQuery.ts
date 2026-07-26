// src/features/rubrics_school/api/useFrameworkVersionOptionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { FrameworkCriterionOption, FrameworkVersionOption } from '../types';

// Lưu ý: BE đã gộp "frameworkVersions" thành 1 query dùng chung cho cả SYSTEM_ADMIN lẫn
// SCHOOL_ADMIN (không còn "schoolFrameworkVersions" riêng nữa). Query gốc hỗ trợ filter
// theo "status" ngay server-side nên FE truyền thẳng status: "PUBLISHED" thay vì tự lọc lại.

const PUBLISHED_STATUS = 'PUBLISHED';

// 1. Danh sách Framework Version (đã PUBLISHED) theo Framework của Rubric đang xem
const GET_SCHOOL_FRAMEWORK_VERSIONS = `
  query GetSchoolFrameworkVersionsForRubric($frameworkId: ID!, $status: String, $page: Int, $size: Int) {
    frameworkVersions(frameworkId: $frameworkId, status: $status, page: $page, size: $size) {
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
      const data = await graphQLRequest<{ frameworkVersions: { content: FrameworkVersionOption[] } }>(
        GET_SCHOOL_FRAMEWORK_VERSIONS,
        { frameworkId, status: PUBLISHED_STATUS, page: 1, size: 100 }
      );
      return data.frameworkVersions.content;
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
