// src/features/rubric_system/api/useAddSystemRubricVersionsMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { rubricVersionQueryKeys } from './useSystemRubricVersionsQuery';
import { searchRubricVersionKeys } from './useSearchSystemRubricVersionsQuery';

// Định nghĩa kiểu dữ liệu cho 1 item y hệt DTO của Backend
export type RubricVersionItemRequest = {
  version: number;
  name: string;
  scoringScaleMin: number;
  scoringScaleMax: number;
  totalScoreMethod: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
};

// Payload bọc trong list "versions"
export type AddRubricVersionsPayload = {
  versions: RubricVersionItemRequest[];
};

export function useAddSystemRubricVersionsMutation(rubricId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddRubricVersionsPayload) => {
      if (!rubricId) throw new Error("Thiếu rubricId");

      const response = await apiClient.post(
        `/v1/rubrics/system/rubrics/${rubricId}/versions`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      // Xóa cache danh sách version của Rubric này để UI tự cập nhật thêm dòng mới
      queryClient.invalidateQueries({ queryKey: rubricVersionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: searchRubricVersionKeys.all });
    },
  });
}
