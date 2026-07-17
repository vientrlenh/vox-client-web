// src/features/rubrics/api/useUpdateSchoolRubricVersionMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { rubricVersionQueryKeys } from './useSchoolRubricVersionsQuery';
import { searchRubricVersionKeys } from './useSearchSchoolRubricVersionsQuery';

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
  mutation UpdateSchoolRubricVersion($schoolId: ID!, $versionId: ID!, $input: UpdateRubricVersionInput!) {
    updateSchoolRubricVersion(schoolId: $schoolId, versionId: $versionId, input: $input)
  }
`;

export function useUpdateSchoolRubricVersionMutation(schoolId: string | undefined, versionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateRubricVersionPayload) => {
      if (!schoolId || !versionId) throw new Error("Thiếu schoolId hoặc versionId");
      
      const res = await graphQLRequest<{ updateSchoolRubricVersion: string }>(UPDATE_VERSION, { 
        schoolId, 
        versionId, 
        input 
      });
      return res.updateSchoolRubricVersion;
    },
    onSuccess: () => {
      // Invalidate (xóa cache) của Version hiện tại để nó gọi lại API lấy data mới
      queryClient.invalidateQueries({ queryKey: ['school-rubric-version', schoolId, versionId] });
      // Cũng nên invalidate danh sách versions ngoài trang Rubric detail
      queryClient.invalidateQueries({ queryKey: rubricVersionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: searchRubricVersionKeys.all });
    },
  });
}