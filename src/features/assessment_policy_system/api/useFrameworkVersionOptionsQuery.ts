// src/features/assessment_policy_system/api/useFrameworkVersionOptionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { FrameworkResultBandOption, FrameworkVersionOption } from '../types';

const PUBLISHED_STATUS = 'PUBLISHED';

// 1. Danh sách Framework Version (đã lọc PUBLISHED) theo Framework đã chọn
const GET_FRAMEWORK_VERSIONS = `
  query GetFrameworkVersions($frameworkId: ID!, $page: Int, $size: Int) {
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
    queryKey: ['assessment-policy-framework-versions', frameworkId],
    queryFn: async () => {
      const data = await graphQLRequest<{ frameworkVersions: { content: FrameworkVersionOption[] } }>(
        GET_FRAMEWORK_VERSIONS,
        { frameworkId, page: 1, size: 100 }
      );
      return data.frameworkVersions.content.filter((version) => version.status === PUBLISHED_STATUS);
    },
    enabled: Boolean(frameworkId),
  });
}

// 2. Danh sách Result Band của một Framework Version cụ thể (dùng cho Target/Minimum Band)
const GET_FRAMEWORK_VERSION_BANDS = `
  query GetFrameworkVersionBands($id: ID!) {
    frameworkVersion(id: $id) {
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
    queryKey: ['assessment-policy-framework-version-bands', frameworkVersionId],
    queryFn: async () => {
      const data = await graphQLRequest<{
        frameworkVersion: { id: string; resultBands: FrameworkResultBandOption[] } | null;
      }>(GET_FRAMEWORK_VERSION_BANDS, { id: frameworkVersionId });
      return data.frameworkVersion?.resultBands ?? [];
    },
    enabled: Boolean(frameworkVersionId),
  });
}
