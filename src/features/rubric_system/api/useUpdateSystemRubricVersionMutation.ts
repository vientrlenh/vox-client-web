// src/features/rubric_system/api/useUpdateSystemRubricVersionMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { rubricVersionQueryKeys } from './useSystemRubricVersionsQuery';
import { searchRubricVersionKeys } from './useSearchSystemRubricVersionsQuery';

export type UpdateRubricVersionPayload = {
  name?: string;
  description?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  scoringScaleMin?: number;
  scoringScaleMax?: number;
  totalScoreMethod?: string;
};

const UPDATE_VERSION = `
  mutation UpdateSystemRubricVersion($versionId: ID!, $input: UpdateRubricVersionInput!) {
    updateSystemRubricVersion(versionId: $versionId, input: $input)
  }
`;

export function useUpdateSystemRubricVersionMutation(versionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateRubricVersionPayload) => {
      if (!versionId) throw new Error("Thiếu versionId");

      const res = await graphQLRequest<{ updateSystemRubricVersion: string }>(UPDATE_VERSION, {
        versionId,
        input
      });
      return res.updateSystemRubricVersion;
    },
    onSuccess: () => {
      // Invalidate (xóa cache) của Version hiện tại để nó gọi lại API lấy data mới
      queryClient.invalidateQueries({ queryKey: ['system-rubric-version', versionId] });
      // Cũng nên invalidate danh sách versions ngoài trang Rubric detail
      queryClient.invalidateQueries({ queryKey: rubricVersionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: searchRubricVersionKeys.all });
    },
  });
}
