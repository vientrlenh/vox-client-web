// src/features/assessment_policy_school/api/useFrameworkVersionOptionsQuery.ts

import { useQueries, useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { useFrameworkOptionsQuery } from './useFilterOptionsQuery';
import type { FrameworkCriterionOption, FrameworkVersionOption } from '../types';

// Lưu ý: BE đã gộp "frameworkVersions" thành 1 query dùng chung cho cả SYSTEM_ADMIN lẫn
// SCHOOL_ADMIN (không còn "schoolFrameworkVersions" riêng nữa). Query gốc hỗ trợ filter theo
// "status" ngay server-side nên FE truyền thẳng status: "PUBLISHED" thay vì tự lọc lại.
// BE cũng đã bỏ query đơn lẻ "schoolFrameworkVersion(id)" (School Admin không còn quyền
// gọi "frameworkVersion(id)" — query đó giờ chỉ SYSTEM_ADMIN dùng được), nên resultBands
// của 1 Version được lấy kèm luôn trong danh sách "frameworkVersions" bên dưới thay vì
// query riêng theo id.

const PUBLISHED_STATUS = 'PUBLISHED';

// 1. Danh sách Framework Version (đã PUBLISHED) theo Framework đã chọn — kèm resultBands
// của từng version để dùng cho dropdown Target/Minimum Band mà không cần query riêng.
const GET_SCHOOL_FRAMEWORK_VERSIONS = `
  query GetSchoolFrameworkVersions($frameworkId: ID!, $status: String, $page: Int, $size: Int) {
    frameworkVersions(frameworkId: $frameworkId, status: $status, page: $page, size: $size) {
      content {
        id
        code
        name
        version
        status
        resultBands {
          id
          code
          label
          order
        }
      }
    }
  }
`;

async function fetchPublishedFrameworkVersions(frameworkId: string): Promise<FrameworkVersionOption[]> {
  const data = await graphQLRequest<{ frameworkVersions: { content: FrameworkVersionOption[] } }>(
    GET_SCHOOL_FRAMEWORK_VERSIONS,
    { frameworkId, status: PUBLISHED_STATUS, page: 1, size: 100 }
  );
  return data.frameworkVersions.content;
}

export type FrameworkVersionWithFramework = FrameworkVersionOption & {
  frameworkId: string;
  frameworkName: string;
};

// Gộp Framework Version (đã PUBLISHED) của TẤT CẢ Framework đang active thành 1 danh sách phẳng.
// Dùng cho form muốn chọn Framework Version trước, rồi tự suy ra Khung năng lực tương ứng —
// BE bắt buộc "frameworkVersions" phải truyền frameworkId (không có query liệt kê version không
// giới hạn theo framework), nên FE phải gọi song song cho từng Framework rồi gộp lại.
export function useAllFrameworkVersionsQuery() {
  const { data: frameworks, isLoading: isLoadingFrameworks } = useFrameworkOptionsQuery();

  const versionQueries = useQueries({
    queries: (frameworks ?? []).map((framework) => ({
      queryKey: ['school-assessment-policy-framework-versions', framework.id],
      queryFn: () => fetchPublishedFrameworkVersions(framework.id),
      enabled: Boolean(frameworks),
    })),
  });

  const isLoading = isLoadingFrameworks || versionQueries.some((q) => q.isLoading);

  const data: FrameworkVersionWithFramework[] | undefined = frameworks
    ? frameworks.flatMap((framework, index) =>
        (versionQueries[index]?.data ?? []).map((version) => ({
          ...version,
          frameworkId: framework.id,
          frameworkName: framework.name,
        }))
      )
    : undefined;

  return { data, isLoading };
}

// 2. Danh sách Tiêu chí (FrameworkCriterion) của 1 Framework Version đã chọn — chỉ để xem/tham khảo
// trong lúc tạo Assessment Policy (Assessment Policy không lưu tham chiếu tới Criterion, chỉ tới
// FrameworkVersion + FrameworkResultBand), giúp School Admin biết Framework Version đó gồm những
// tiêu chí gì trước khi gắn Rubric Version vào.
const GET_SCHOOL_FRAMEWORK_CRITERIA = `
  query GetSchoolFrameworkCriteriaForPolicy($frameworkVersionId: ID!) {
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
    queryKey: ['school-assessment-policy-framework-version-criteria', frameworkVersionId],
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
