// src/features/rubrics/api/useDeleteSchoolRubricResultBandMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { searchRubricResultBandKeys } from './useSearchSchoolRubricResultBandsQuery';

export function useDeleteSchoolRubricResultBandMutation(schoolId: string | undefined, versionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resultBandId: string) => {
      if (!schoolId || !versionId || !resultBandId) throw new Error("Thiếu thông tin để xóa thang điểm");

      const response = await apiClient.delete(
        `/v1/rubrics/schools/${schoolId}/rubric-versions/${versionId}/result-bands/${resultBandId}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchRubricResultBandKeys.all });
      queryClient.invalidateQueries({ queryKey: ['school-rubric-result-band'] });
    },
  });
}
