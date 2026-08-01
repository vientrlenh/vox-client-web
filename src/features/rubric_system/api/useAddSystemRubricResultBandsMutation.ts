// src/features/rubric_system/api/useAddSystemRubricResultBandsMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricResultBandKeys } from './useSearchSystemRubricResultBandsQuery';

export type RubricResultBandItemRequest = {
  code: string;
  name: string;
  description?: string;
  // Lưu ý: BE yêu cầu đúng tên field "mappedScoreMin"/"mappedScoreMax" cho request tạo mới
  // (khác với "scoreMin"/"scoreMax" dùng ở GraphQL view/search/update) — sai tên sẽ bị BE
  // hiểu là null và trả 400 "Điểm quy đổi tối đa không được để trống".
  mappedScoreMin: number;
  mappedScoreMax: number;
  order: number;
};

export type AddRubricResultBandsPayload = {
  resultBands: RubricResultBandItemRequest[];
};

export function useAddSystemRubricResultBandsMutation(versionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddRubricResultBandsPayload) => {
      if (!versionId) throw new Error("Thiếu versionId");

      const response = await apiClient.post(
        `/v1/rubrics/system/rubric-versions/${versionId}/result-bands`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricResultBandKeys.all });
    },
  });
}
