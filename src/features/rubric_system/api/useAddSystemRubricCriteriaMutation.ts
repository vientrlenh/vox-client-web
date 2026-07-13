// src/features/rubric_system/api/useAddSystemRubricCriteriaMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricCriteriaKeys } from './useSearchSystemRubricCriteriaQuery';

// Định nghĩa kiểu dữ liệu cho 1 item y hệt DTO của Backend
export type RubricCriterionExampleItem = {
  transcript: string;
  explanation: string;
  expectedScore: number;
};

export type RubricCriterionItemRequest = {
  frameworkCriterionId: string;
  code: string;
  name: string;
  description?: string;
  examples?: RubricCriterionExampleItem[];
  weight: number;
  minScore: number;
  maxScore: number;
  order: number;
  isRequired: boolean;
};

// Payload bọc trong list "criteria"
export type AddRubricCriteriaPayload = {
  criteria: RubricCriterionItemRequest[];
};

export function useAddSystemRubricCriteriaMutation(versionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddRubricCriteriaPayload) => {
      if (!versionId) throw new Error("Thiếu versionId");

      const response = await apiClient.post(
        `/v1/rubrics/system/rubric-versions/${versionId}/criteria`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricCriteriaKeys.all });
    },
  });
}
