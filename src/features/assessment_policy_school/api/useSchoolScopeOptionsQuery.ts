// src/features/assessment_policy_school/api/useSchoolScopeOptionsQuery.ts
// Dùng cho dropdown giới hạn phạm vi áp dụng Assessment Policy: Khối -> Niên khóa -> Lớp.

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';

export type GradeLevelOption = {
  id: string;
  code: string;
  name: string;
};

export type SchoolGradeOption = {
  id: string;
  code?: string | null;
  name?: string | null;
};

// 1. Danh sách Khối (GradeLevel) -- catalog dùng chung toàn hệ thống, không lọc theo trường.
//    Mọi vai trò đã đăng nhập đều đọc được nên không cần truyền schoolId nữa.
const GET_GRADE_LEVELS = `
  query GetGradeLevels($page: Int, $size: Int) {
    gradeLevels(page: $page, size: $size) {
      content {
        id
        code
        name
      }
    }
  }
`;

export function useGradeLevelOptionsQuery(enabled = true) {
  return useQuery({
    queryKey: ['assessment-policy-grade-level-options'],
    queryFn: async () => {
      const data = await graphQLRequest<{ gradeLevels: { content: GradeLevelOption[] } }>(
        GET_GRADE_LEVELS,
        { page: 1, size: 100 }
      );
      return data.gradeLevels.content;
    },
    enabled,
  });
}

// 2. Danh sách Niên khóa (SchoolGrade) của trường, lọc theo Khối đã chọn (nếu có)
const GET_SCHOOL_GRADES = `
  query GetSchoolGrades($schoolId: ID!, $gradeLevelId: ID, $page: Int, $size: Int) {
    schoolGrades(schoolId: $schoolId, gradeLevelId: $gradeLevelId, page: $page, size: $size) {
      content {
        id
        code
        name
      }
    }
  }
`;

export function useSchoolGradeOptionsQuery(schoolId: string | undefined, gradeLevelId?: string) {
  return useQuery({
    queryKey: ['school-assessment-policy-grade-options', schoolId, gradeLevelId],
    queryFn: async () => {
      const data = await graphQLRequest<{ schoolGrades: { content: SchoolGradeOption[] } }>(
        GET_SCHOOL_GRADES,
        { schoolId, gradeLevelId: gradeLevelId || null, page: 1, size: 100 }
      );
      return data.schoolGrades.content;
    },
    enabled: Boolean(schoolId) && Boolean(gradeLevelId),
  });
}
