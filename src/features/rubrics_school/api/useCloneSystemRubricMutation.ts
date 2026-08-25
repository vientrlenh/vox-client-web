// src/features/rubrics/api/useCloneSystemRubricMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { rubricQueryKeys } from './useSchoolRubricsQuery';
import { searchRubricKeys } from './useSearchSchoolRubricsQuery';
import { rubricVersionQueryKeys } from './useSchoolRubricVersionsQuery';

/**
 * Một chính sách chấm mẫu được sao kèm, với PHẠM VI RIÊNG của nó.
 *
 * Phạm vi đi theo từng chính sách chứ không theo cả lần sao: mỗi phạm vi chỉ được đúng một chính
 * sách còn hiệu lực, nên sao hai bản mẫu khác bậc mục tiêu vào cùng một phạm vi sẽ bị từ chối.
 */
export type CloneSystemRubricPolicyChoice = {
  sourcePolicyId: string;
  /** Chỉ gửi khi bản mẫu KHÔNG gắn Khối; khi đó phải có đúng 1 trong 3. */
  gradeLevelId?: string;
  schoolGradeId?: string;
  schoolClassId?: string;
  effectiveFrom: string;
  effectiveTo?: string;
};

export type CloneSystemRubricPayload = {
  sourceRubricVersionId: string;
  code: string;
  name: string;
  description?: string;
  /** Bỏ trống thì giữ nguyên cách tính của bản mẫu. */
  totalScoreMethod?: string;
  /**
   * Bỏ trống = chỉ sao bộ tiêu chí. Khi đó phiên bản mới nằm DRAFT tới khi trường tự gắn một chính
   * sách, vì ban hành phiên bản đòi phải có chính sách liên kết đã PUBLISHED.
   */
  policies?: CloneSystemRubricPolicyChoice[];
};

export type CloneSystemRubricResult = {
  versionId: string;
  /** Null khi không tra được (xem ghi chú ở {@link fetchRubricIdOfVersion}). */
  rubricId: string | null;
};

const GET_VERSION_RUBRIC_ID = `
  query CloneRubricVersionOwner($schoolId: ID!, $versionId: ID!) {
    viewSchoolRubricVersion(schoolId: $schoolId, versionId: $versionId) {
      rubricId
    }
  }
`;

/**
 * Tra id rubric của phiên bản vừa tạo.
 *
 * REST trả về id PHIÊN BẢN (thứ dùng để gắn chính sách đánh giá ngay sau đó), nhưng đường dẫn trang
 * chi tiết lại lồng dưới rubric: `/school-admin/rubrics/:rubricId/versions/:versionId`. Nên phải hỏi
 * thêm một nhịp mới đủ đường đi.
 *
 * Hỏng ở bước này KHÔNG phải hỏng việc sao chép — bản sao đã nằm trong DB rồi. Vì vậy nuốt lỗi và
 * trả null để trang cha lui về danh sách rubric, thay vì hiện lỗi làm người dùng tưởng phải làm lại.
 */
async function fetchRubricIdOfVersion(schoolId: string, versionId: string): Promise<string | null> {
  try {
    const data = await graphQLRequest<{ viewSchoolRubricVersion: { rubricId: string } | null }>(
      GET_VERSION_RUBRIC_ID,
      { schoolId, versionId }
    );
    return data.viewSchoolRubricVersion?.rubricId ?? null;
  } catch {
    return null;
  }
}

export function useCloneSystemRubricMutation(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CloneSystemRubricPayload): Promise<CloneSystemRubricResult> => {
      if (!schoolId) throw new Error('Không tìm thấy ID trường học');

      const response = await apiClient.post(
        `/v1/rubrics/schools/${schoolId}/rubrics/clone-from-system`,
        payload
      );

      // Theo ApiResponse<UUID> của BE, id nằm ở response.data.data
      const versionId = response.data.data as string;
      return { versionId, rubricId: await fetchRubricIdOfVersion(schoolId, versionId) };
    },
    onSuccess: () => {
      // Bản sao tạo ra một rubric MỚI kèm một phiên bản MỚI, nên phải dọn cả hai họ cache: danh
      // sách rubric của trường (cả đường xem lẫn đường tìm kiếm) và danh sách phiên bản.
      queryClient.invalidateQueries({ queryKey: rubricQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: searchRubricKeys.all });
      queryClient.invalidateQueries({ queryKey: rubricVersionQueryKeys.all });
      // Lần sao có kèm chính sách sẽ tạo Assessment Policy mới cho trường, nên danh sách chính sách
      // đang mở ở tab khác cũng phải nạp lại.
      queryClient.invalidateQueries({ queryKey: ['school-assessment-policies'] });
    },
  });
}
