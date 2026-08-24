// src/features/assessment_policy_school/api/useGradeLevelBandCeilingQuery.ts
// Trần bậc mục tiêu (default + hard max) theo (Khối/Niên khóa/Lớp, Framework Version) -- dùng để
// gợi ý/ràng buộc dropdown Target Band lúc Tạo/Sửa Assessment Policy, tránh chọn "vô tội vạ" rồi
// mới bị BE chặn lúc submit.

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';

export type GradeLevelBandCeilingScope = {
  gradeLevelId?: string;
  schoolGradeId?: string;
  schoolClassId?: string;
};

export type GradeLevelBandCeiling = {
  defaultBandId: string;
  defaultBandLabel: string;
  hardMaxBandId: string;
  hardMaxBandOrder: number;
  hardMaxBandLabel: string;
};

const GET_GRADE_LEVEL_BAND_CEILING = `
  query GetGradeLevelBandCeiling($schoolId: ID!, $frameworkVersionId: ID!, $gradeLevelId: ID, $schoolGradeId: ID, $schoolClassId: ID) {
    gradeLevelBandCeiling(schoolId: $schoolId, frameworkVersionId: $frameworkVersionId, gradeLevelId: $gradeLevelId, schoolGradeId: $schoolGradeId, schoolClassId: $schoolClassId) {
      defaultBand {
        id
        label
      }
      hardMaxBand {
        id
        order
        label
      }
    }
  }
`;

// Form cascading Khối -> Niên khóa -> Lớp giữ lại CẢ BA id cùng lúc (để còn lọc dropdown hẹp hơn),
// nhưng BE chỉ chấp nhận đúng 1 phạm vi -- gửi cả 3 sẽ bị chặn "scopeCount > 1" và query lỗi im
// lặng, khiến band ceiling coi như "không có" (mở hết, kể cả bậc vượt trần). Phải quy về đúng 1 id
// hẹp nhất trước khi gửi, khớp thứ tự ưu tiên Lớp > Niên khóa > Khối như lúc submit thật.
function narrowestScopeArgs(scope: GradeLevelBandCeilingScope) {
  if (scope.schoolClassId) return { gradeLevelId: null, schoolGradeId: null, schoolClassId: scope.schoolClassId };
  if (scope.schoolGradeId) return { gradeLevelId: null, schoolGradeId: scope.schoolGradeId, schoolClassId: null };
  if (scope.gradeLevelId) return { gradeLevelId: scope.gradeLevelId, schoolGradeId: null, schoolClassId: null };
  return { gradeLevelId: null, schoolGradeId: null, schoolClassId: null };
}

export function useGradeLevelBandCeilingQuery(
  schoolId: string | undefined,
  scope: GradeLevelBandCeilingScope,
  frameworkVersionId: string | undefined,
) {
  const narrowest = narrowestScopeArgs(scope);
  const scopeId = narrowest.schoolClassId || narrowest.schoolGradeId || narrowest.gradeLevelId || undefined;

  return useQuery({
    queryKey: ['school-assessment-policy-grade-level-band-ceiling', schoolId, narrowest.gradeLevelId, narrowest.schoolGradeId, narrowest.schoolClassId, frameworkVersionId],
    queryFn: async () => {
      const data = await graphQLRequest<{
        gradeLevelBandCeiling: {
          defaultBand: { id: string; label: string };
          hardMaxBand: { id: string; order: number; label: string };
        } | null;
      }>(GET_GRADE_LEVEL_BAND_CEILING, {
        schoolId,
        frameworkVersionId,
        gradeLevelId: narrowest.gradeLevelId,
        schoolGradeId: narrowest.schoolGradeId,
        schoolClassId: narrowest.schoolClassId,
      });

      const ceiling = data.gradeLevelBandCeiling;
      if (!ceiling) return null;

      const result: GradeLevelBandCeiling = {
        defaultBandId: ceiling.defaultBand.id,
        defaultBandLabel: ceiling.defaultBand.label,
        hardMaxBandId: ceiling.hardMaxBand.id,
        hardMaxBandOrder: ceiling.hardMaxBand.order,
        hardMaxBandLabel: ceiling.hardMaxBand.label,
      };
      return result;
    },
    enabled: Boolean(schoolId) && Boolean(scopeId) && Boolean(frameworkVersionId),
  });
}
