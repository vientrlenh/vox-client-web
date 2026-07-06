// src/features/assessment_policy_school/api/useSchoolScopeOptionsQuery.ts
// Dùng cho dropdown giới hạn phạm vi áp dụng Assessment Policy: Khối -> Niên khóa -> Lớp.

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';

export type SchoolGradeLevelOption = {
  id: string;
  code: string;
  name: string;
};

export type SchoolGradeOption = {
  id: string;
  code?: string | null;
  name?: string | null;
};

// 1. Danh sách Khối (SchoolGradeLevel) của trường
const GET_SCHOOL_GRADE_LEVELS = `
  query GetSchoolGradeLevels($schoolId: ID!, $page: Int, $size: Int) {
    schoolGradeLevels(schoolId: $schoolId, page: $page, size: $size) {
      content {
        id
        code
        name
      }
    }
  }
`;

export function useSchoolGradeLevelOptionsQuery(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['school-assessment-policy-grade-level-options', schoolId],
    queryFn: async () => {
      const data = await graphQLRequest<{ schoolGradeLevels: { content: SchoolGradeLevelOption[] } }>(
        GET_SCHOOL_GRADE_LEVELS,
        { schoolId, page: 1, size: 100 }
      );
      return data.schoolGradeLevels.content;
    },
    enabled: Boolean(schoolId),
  });
}

// 2. Danh sách Niên khóa (SchoolGrade) của trường, lọc theo Khối đã chọn (nếu có)
const GET_SCHOOL_GRADES = `
  query GetSchoolGrades($schoolId: ID!, $schoolGradeLevelId: ID, $page: Int, $size: Int) {
    schoolGrades(schoolId: $schoolId, schoolGradeLevelId: $schoolGradeLevelId, page: $page, size: $size) {
      content {
        id
        code
        name
      }
    }
  }
`;

export function useSchoolGradeOptionsQuery(schoolId: string | undefined, schoolGradeLevelId?: string) {
  return useQuery({
    queryKey: ['school-assessment-policy-grade-options', schoolId, schoolGradeLevelId],
    queryFn: async () => {
      const data = await graphQLRequest<{ schoolGrades: { content: SchoolGradeOption[] } }>(
        GET_SCHOOL_GRADES,
        { schoolId, schoolGradeLevelId: schoolGradeLevelId || null, page: 1, size: 100 }
      );
      return data.schoolGrades.content;
    },
    enabled: Boolean(schoolId),
  });
}
