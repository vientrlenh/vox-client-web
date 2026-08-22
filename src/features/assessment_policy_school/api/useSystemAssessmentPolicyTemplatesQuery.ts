// src/features/assessment_policy_school/api/useSystemAssessmentPolicyTemplatesQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { AssessmentPolicy, AssessmentPolicyPage } from '../types';

export const systemAssessmentPolicyTemplateKeys = {
  all: ['system-assessment-policy-templates'] as const,
  lists: () => [...systemAssessmentPolicyTemplateKeys.all, 'list'] as const,
  list: (languageId: string | null, page: number, size: number) =>
    [...systemAssessmentPolicyTemplateKeys.lists(), languageId, page, size] as const,
};

/**
 * Chính sách chấm mẫu của hệ thống — thứ trường sao về qua
 * {@link useCloneSystemAssessmentPolicyMutation}.
 *
 * Dùng chung query `viewSystemAssessmentPolicies` với màn của System Admin, nhưng LUÔN ghim
 * `status: "PUBLISHED"`. Hai lý do, và cả hai đều cần:
 *
 * - Backend chỉ cho sao bản đã ban hành (`CloneSystemAssessmentPolicyToSchoolUseCase` chặn mọi
 *   trạng thái khác), nên hiện bản nháp ra chỉ tạo một lựa chọn chắc chắn thất bại.
 * - Backend cũng tự ép PUBLISHED cho tài khoản không phải System Admin, nên bỏ tham số này đi thì
 *   kết quả vẫn thế. Ghim ở đây để màn hình nói đúng thứ nó đang hiển thị, thay vì phụ thuộc vào
 *   một hành vi ngầm ở phía kia.
 */
export type SystemAssessmentPolicyTemplate = AssessmentPolicy;

const SYSTEM_ASSESSMENT_POLICY_TEMPLATES = `
  query SystemAssessmentPolicyTemplates($languageId: ID, $page: Int, $size: Int) {
    viewSystemAssessmentPolicies(status: "PUBLISHED", languageId: $languageId, page: $page, size: $size) {
      content {
        id
        languageId
        frameworkVersionId
        rubricVersionId
        targetFrameworkBandId
        passingScore
        strictness
        version
        status
        effectiveFrom
        effectiveTo
        language {
          name
        }
        gradeLevel {
          id
          code
          name
        }
        frameworkVersion {
          code
          name
          version
          status
        }
        rubricVersion {
          code
          name
          version
          status
          scoringScaleMin
          scoringScaleMax
        }
        targetFrameworkBand {
          code
          label
        }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`;

async function fetchSystemAssessmentPolicyTemplates(
  languageId: string | null,
  page: number,
  size: number
): Promise<AssessmentPolicyPage> {
  const data = await graphQLRequest<{ viewSystemAssessmentPolicies: AssessmentPolicyPage }>(
    SYSTEM_ASSESSMENT_POLICY_TEMPLATES,
    { languageId: languageId || null, page, size }
  );

  const response = data.viewSystemAssessmentPolicies;
  return {
    ...response,
    page: response.page + 1, // Bù trừ 0-based từ Backend lên 1-based cho Pagination UI
  };
}

export function useSystemAssessmentPolicyTemplatesQuery(
  languageId: string | null,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: systemAssessmentPolicyTemplateKeys.list(languageId, page, size),
    queryFn: () => fetchSystemAssessmentPolicyTemplates(languageId, page, size),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5, // Danh mục mẫu của hệ thống rất ít đổi
  });
}
