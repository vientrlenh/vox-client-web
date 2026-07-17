// src/features/rubric_system/api/useSystemRubricVersionQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';

// Khai báo kiểu dữ liệu khớp 100% với RubricVersionDto của BE
export type RubricVersion = {
  id: string;
  rubricId: string;
  version: number;
  code: string;
  name: string;
  description?: string;
  status: string;
  effectiveFrom: string;
  effectiveTo?: string;
  scoringScaleMin: number;
  scoringScaleMax: number;
  totalScoreMethod: string;
};

// Câu lệnh Query gọi thẳng vào viewSystemRubricVersion
const GET_SYSTEM_RUBRIC_VERSION = `
  query ViewSystemRubricVersion($versionId: ID!) {
    viewSystemRubricVersion(versionId: $versionId) {
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
  }
`;

export function useSystemRubricVersionQuery(versionId: string | undefined) {
  return useQuery({
    queryKey: ['system-rubric-version', versionId],
    queryFn: async () => {
      const data = await graphQLRequest<{ viewSystemRubricVersion: RubricVersion }>(
        GET_SYSTEM_RUBRIC_VERSION,
        { versionId }
      );
      return data.viewSystemRubricVersion;
    },
    enabled: Boolean(versionId),
    staleTime: 1000 * 60 * 5, // Cache data 5 phút
  });
}
