// src/features/assessment_policy_school/api/useRubricVersionPolicyUsageQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';

/**
 * Các Assessment Policy của trường đang trỏ vào một Rubric Version, rút gọn còn id + trạng thái.
 *
 * Dùng để biết TRƯỚC khi Lưu trữ một chính sách rằng thao tác đó có kéo theo lưu trữ luôn Rubric
 * Version hay không: backend (`ArchiveSchoolAssessmentPolicyUseCase`) chỉ archive Rubric Version khi
 * không còn chính sách nào khác còn hiệu lực dùng nó. Từ V44 nhiều chính sách dùng chung được một
 * phiên bản, nên hệ quả của nút Lưu trữ không còn đoán được từ mỗi trang chi tiết.
 *
 * Cố ý KHÔNG dùng lại `useSchoolAssessmentPoliciesQuery`: query đó kéo cả framework version kèm
 * result bands, trường, khối, niên khóa và lớp cho từng dòng -- quá nặng cho một phép đếm.
 */
const RUBRIC_VERSION_POLICY_USAGE = `
  query RubricVersionPolicyUsage($schoolId: ID!, $rubricVersionId: ID, $page: Int, $size: Int) {
    viewSchoolAssessmentPolicies(schoolId: $schoolId, rubricVersionId: $rubricVersionId, page: $page, size: $size) {
      content {
        id
        status
      }
    }
  }
`;

export type RubricVersionPolicyUsage = {
  id: string;
  status: string;
};

export const rubricVersionPolicyUsageKeys = {
  all: ['rubric-version-policy-usage'] as const,
  byRubricVersion: (schoolId: string, rubricVersionId: string) =>
    [...rubricVersionPolicyUsageKeys.all, schoolId, rubricVersionId] as const,
};

async function fetchRubricVersionPolicyUsage(schoolId: string, rubricVersionId: string) {
  const data = await graphQLRequest<{
    viewSchoolAssessmentPolicies: { content: RubricVersionPolicyUsage[] };
  }>(RUBRIC_VERSION_POLICY_USAGE, {
    schoolId,
    rubricVersionId,
    page: 1,
    // Mặc định của backend là 10. Một phiên bản Rubric dùng chung cho nhiều lớp thì vượt 10 là
    // chuyện bình thường, mà đếm thiếu ở đây sẽ cảnh báo sai chiều (báo là sẽ archive kèm trong khi
    // thực ra không).
    size: 200,
  });

  return data.viewSchoolAssessmentPolicies.content;
}

export function useRubricVersionPolicyUsageQuery(
  schoolId: string | undefined,
  rubricVersionId: string | undefined | null
) {
  return useQuery({
    queryKey: rubricVersionPolicyUsageKeys.byRubricVersion(schoolId || '', rubricVersionId || ''),
    queryFn: () => fetchRubricVersionPolicyUsage(schoolId!, rubricVersionId!),
    enabled: Boolean(schoolId) && Boolean(rubricVersionId),
  });
}
