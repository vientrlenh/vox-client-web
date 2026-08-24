// src/features/rubrics_school/api/useSystemPolicyTemplatesForVersionQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';

/**
 * Chính sách chấm MẪU đã ban hành gắn với một phiên bản bộ tiêu chí của hệ thống.
 *
 * Sao bộ tiêu chí và tạo chính sách cho nó là một bước duy nhất: bản sao ra ở trạng thái DRAFT, mà
 * phiên bản DRAFT chưa ban hành được nếu chưa có chính sách liên kết đã PUBLISHED. Danh sách này là
 * thứ trường chọn ngay trong hộp thoại sao chép.
 *
 * Ghim `status: "PUBLISHED"` vì backend chỉ sao được từ bản mẫu đã ban hành
 * (`CloneSystemRubricToSchoolUseCase`) -- hiện bản nháp ra chỉ tạo một lựa chọn chắc chắn thất bại.
 */
export type SystemPolicyTemplate = {
  id: string;
  strictness: string;
  passingScore?: number | null;
  targetFrameworkBand?: { code: string; label: string } | null;
  frameworkVersion?: { name?: string | null; version?: number | null } | null;
  /** Bản mẫu đã khai Khối thì bản sao BẮT BUỘC giữ khối đó, trường không chọn phạm vi khác được. */
  gradeLevel?: { id: string; code?: string | null; name?: string | null } | null;
};

const SYSTEM_POLICY_TEMPLATES_FOR_VERSION = `
  query SystemPolicyTemplatesForVersion($rubricVersionId: ID, $page: Int, $size: Int) {
    viewSystemAssessmentPolicies(status: "PUBLISHED", rubricVersionId: $rubricVersionId, page: $page, size: $size) {
      content {
        id
        strictness
        passingScore
        targetFrameworkBand {
          code
          label
        }
        frameworkVersion {
          name
          version
        }
        gradeLevel {
          id
          code
          name
        }
      }
    }
  }
`;

export const systemPolicyTemplateKeys = {
  all: ['system-policy-templates-for-version'] as const,
  byVersion: (rubricVersionId: string) => [...systemPolicyTemplateKeys.all, rubricVersionId] as const,
};

async function fetchSystemPolicyTemplates(rubricVersionId: string) {
  const data = await graphQLRequest<{
    viewSystemAssessmentPolicies: { content: SystemPolicyTemplate[] };
  }>(SYSTEM_POLICY_TEMPLATES_FOR_VERSION, { rubricVersionId, page: 1, size: 50 });

  return data.viewSystemAssessmentPolicies.content;
}

export function useSystemPolicyTemplatesForVersionQuery(
  rubricVersionId: string | undefined | null,
  enabled = true
) {
  return useQuery({
    queryKey: systemPolicyTemplateKeys.byVersion(rubricVersionId || ''),
    queryFn: () => fetchSystemPolicyTemplates(rubricVersionId!),
    enabled: Boolean(rubricVersionId) && enabled,
  });
}
