// src/features/rubric_system/api/useCreateSystemRubricMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricKeys } from './useSearchSystemRubricsQuery';

export type CreateRubricPayload = {
  code: string;
  name: string;
  description?: string;
  languageId: string;
  frameworkId: string;
};

export function useCreateSystemRubricMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRubricPayload) => {
      const response = await apiClient.post(`/v1/rubrics/system/rubrics`, payload);

      // Dựa theo ApiResponse<UUID> của BE, ID sẽ nằm trong response.data.data
      return response.data.data as string;
    },
    onSuccess: () => {
      // Xóa cache danh sách Rubric để nó tự load lại data mới nhất
      queryClient.invalidateQueries({ queryKey: searchRubricKeys.all });
    },
  });
}
