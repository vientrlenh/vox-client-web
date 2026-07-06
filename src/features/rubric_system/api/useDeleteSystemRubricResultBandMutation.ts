// src/features/rubric_system/api/useDeleteSystemRubricResultBandMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricResultBandKeys } from './useSearchSystemRubricResultBandsQuery';

export function useDeleteSystemRubricResultBandMutation(versionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resultBandId: string) => {
      if (!versionId || !resultBandId) throw new Error("Thiếu thông tin để xóa thang điểm");

      const response = await apiClient.delete(
        `/v1/rubrics/system/rubric-versions/${versionId}/result-bands/${resultBandId}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricResultBandKeys.all });
      queryClient.invalidateQueries({ queryKey: ['system-rubric-result-band'] });
    },
  });
}
