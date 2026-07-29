// src/features/rubrics/api/useAddSchoolRubricVersionsMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { rubricVersionQueryKeys } from './useSchoolRubricVersionsQuery';
import { searchRubricVersionKeys } from './useSearchSchoolRubricVersionsQuery';

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

export function useAddSchoolRubricVersionsMutation(schoolId?: string, rubricId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddRubricVersionsPayload) => {
      if (!schoolId || !rubricId) throw new Error("Thiếu schoolId hoặc rubricId");
      
      // Gọi REST API (Dùng apiClient đã setup sẵn)
      const response = await apiClient.post(
        `/v1/rubrics/schools/${schoolId}/rubrics/${rubricId}/versions`, 
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
