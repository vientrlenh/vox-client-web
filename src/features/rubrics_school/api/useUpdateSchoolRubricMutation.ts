// src/features/rubrics/api/useUpdateSchoolRubricMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { rubricDetailKey } from './useSchoolRubricQuery';
import { rubricQueryKeys } from './useSchoolRubricsQuery';
import { searchRubricKeys } from './useSearchSchoolRubricsQuery';

type UpdateRubricInput = {
  name: string;
  description?: string;
};

const UPDATE_SCHOOL_RUBRIC = `
  mutation UpdateSchoolRubric($schoolId: ID!, $id: ID!, $input: UpdateRubricInput!) {
    updateSchoolRubric(schoolId: $schoolId, id: $id, input: $input)
  }
`;

async function updateSchoolRubric(schoolId: string, id: string, input: UpdateRubricInput): Promise<string> {
  const data = await graphQLRequest<{ updateSchoolRubric: string }>(
    UPDATE_SCHOOL_RUBRIC,
    { schoolId, id, input }
  );
  return data.updateSchoolRubric;
}

export function useUpdateSchoolRubricMutation(schoolId: string | undefined, rubricId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateRubricInput) => updateSchoolRubric(schoolId!, rubricId!, input),
    onSuccess: () => {
      // Khi cập nhật thành công, làm mới lại data của chi tiết Rubric hiện tại
      if (schoolId && rubricId) {
        queryClient.invalidateQueries({ queryKey: rubricDetailKey(schoolId, rubricId) });
      }
      // Đồng thời làm mới danh sách Rubric ngoài bảng tổng
      if (schoolId) {
        queryClient.invalidateQueries({ queryKey: rubricQueryKeys.lists() });
      }
      queryClient.invalidateQueries({ queryKey: searchRubricKeys.all });
    },
  });
}