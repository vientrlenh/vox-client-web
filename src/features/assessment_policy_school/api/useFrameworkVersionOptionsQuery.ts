// src/features/assessment_policy_school/api/useFrameworkVersionOptionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { FrameworkResultBandOption, FrameworkVersionOption } from '../types';

// Lưu ý: "frameworkVersions"/"frameworkVersion" chỉ SYSTEM_ADMIN mới gọi được.
// School Admin phải dùng "schoolFrameworkVersions"/"schoolFrameworkVersion"
// (BE tự lọc chỉ trả về bản PUBLISHED nên không cần filter status ở FE nữa).

// 1. Danh sách Framework Version (đã PUBLISHED) theo Framework đã chọn
const GET_SCHOOL_FRAMEWORK_VERSIONS = `
  query GetSchoolFrameworkVersions($frameworkId: ID!, $page: Int, $size: Int) {
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
    queryKey: ['school-assessment-policy-framework-versions', frameworkId],
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

// 2. Danh sách Result Band của một Framework Version cụ thể (dùng cho Target/Minimum Band)
const GET_SCHOOL_FRAMEWORK_VERSION_BANDS = `
  query GetSchoolFrameworkVersionBands($id: ID!) {
    schoolFrameworkVersion(id: $id) {
      id
      resultBands {
        id
        code
        label
        order
      }
    }
  }
`;

export function useFrameworkVersionBandsQuery(frameworkVersionId?: string) {
  return useQuery({
    queryKey: ['school-assessment-policy-framework-version-bands', frameworkVersionId],
    queryFn: async () => {
      const data = await graphQLRequest<{
        schoolFrameworkVersion: { id: string; resultBands: FrameworkResultBandOption[] } | null;
      }>(GET_SCHOOL_FRAMEWORK_VERSION_BANDS, { id: frameworkVersionId });
      return data.schoolFrameworkVersion?.resultBands ?? [];
    },
    enabled: Boolean(frameworkVersionId),
  });
}
