// src/features/rubric_system/api/useUpdateSystemRubricMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { rubricDetailKey } from './useSystemRubricQuery';
import { rubricQueryKeys } from './useSystemRubricsQuery';
import { searchRubricKeys } from './useSearchSystemRubricsQuery';

type UpdateRubricInput = {
  name: string;
  description?: string;
};

const UPDATE_SYSTEM_RUBRIC = `
  mutation UpdateSystemRubric($id: ID!, $input: UpdateRubricInput!) {
    updateSystemRubric(id: $id, input: $input)
  }
`;

async function updateSystemRubric(id: string, input: UpdateRubricInput): Promise<string> {
  const data = await graphQLRequest<{ updateSystemRubric: string }>(
    UPDATE_SYSTEM_RUBRIC,
    { id, input }
  );
  return data.updateSystemRubric;
}

export function useUpdateSystemRubricMutation(rubricId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateRubricInput) => updateSystemRubric(rubricId!, input),
    onSuccess: () => {
      // Khi cập nhật thành công, làm mới lại data của chi tiết Rubric hiện tại
      if (rubricId) {
        queryClient.invalidateQueries({ queryKey: rubricDetailKey(rubricId) });
      }
      // Đồng thời làm mới danh sách Rubric ngoài bảng tổng
      queryClient.invalidateQueries({ queryKey: rubricQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: searchRubricKeys.all });
    },
  });
}
