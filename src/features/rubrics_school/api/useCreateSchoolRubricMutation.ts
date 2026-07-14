// src/features/rubrics/api/useCreateSchoolRubricMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricKeys } from './useSearchSchoolRubricsQuery';

export type CreateRubricPayload = {
  code: string;
  name: string;
  description?: string;
  languageId: string;
  frameworkId: string;
};

export function useCreateSchoolRubricMutation(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRubricPayload) => {
      if (!schoolId) throw new Error("Không tìm thấy ID trường học");

      const response = await apiClient.post(`/v1/rubrics/schools/${schoolId}/rubrics`, payload);

      // Dựa theo ApiResponse<UUID> của BE, ID sẽ nằm trong response.data.data
      return response.data.data as string;
    },
    onSuccess: () => {
      // Xóa cache danh sách Rubric để nó tự load lại data mới nhất
      queryClient.invalidateQueries({ queryKey: searchRubricKeys.all });
    },
  });
}