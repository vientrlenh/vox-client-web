// src/features/rubrics_school/api/useDeleteSchoolRubricMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { rubricQueryKeys } from './useSchoolRubricsQuery';
import { searchRubricKeys } from './useSearchSchoolRubricsQuery';

export function useDeleteSchoolRubricMutation(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rubricId: string) => {
      if (!schoolId) throw new Error("Không tìm thấy ID trường học");
      if (!rubricId) throw new Error("Thiếu rubricId");

      const response = await apiClient.delete(`/v1/rubrics/schools/${schoolId}/rubrics/${rubricId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rubricQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: searchRubricKeys.all });
    },
  });
}
