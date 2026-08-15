// src/features/rubrics/api/useSchoolRubricVersionQuery.ts

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
  createdAt?: string | null;
  sourceRubricVersionId?: string | null;
};

// Câu lệnh Query gọi thẳng vào viewSchoolRubricVersion
const GET_SCHOOL_RUBRIC_VERSION = `
  query ViewSchoolRubricVersion($schoolId: ID!, $versionId: ID!) {
    viewSchoolRubricVersion(schoolId: $schoolId, versionId: $versionId) {
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
      createdAt
      sourceRubricVersionId
    }
  }
`;

export function useSchoolRubricVersionQuery(schoolId: string | undefined, versionId: string | undefined) {
  return useQuery({
    queryKey: ['school-rubric-version', schoolId, versionId],
    queryFn: async () => {
      const data = await graphQLRequest<{ viewSchoolRubricVersion: RubricVersion }>(
        GET_SCHOOL_RUBRIC_VERSION,
        { schoolId, versionId }
      );
      return data.viewSchoolRubricVersion;
    },
    // Chỉ chạy Query khi có đủ cả schoolId và versionId
    enabled: Boolean(schoolId && versionId),
    staleTime: 1000 * 60 * 5, // Cache data 5 phút
  });
}
