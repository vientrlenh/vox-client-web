// src/features/rubric_system/api/useDeleteSystemRubricMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { rubricQueryKeys } from './useSystemRubricsQuery';
import { searchRubricKeys } from './useSearchSystemRubricsQuery';

export function useDeleteSystemRubricMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rubricId: string) => {
      if (!rubricId) throw new Error("Thiếu rubricId");

      const response = await apiClient.delete(`/v1/rubrics/system/rubrics/${rubricId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubricQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: searchRubricKeys.all });
    },
  });
}
