// src/features/assessment_policy_school/api/useRubricOptionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { RubricOption, RubricVersionOption } from '../types';

// 1. Danh sách Rubric của trường để chọn, lọc theo ngôn ngữ đã chọn ở form
const SEARCH_SCHOOL_RUBRICS_FOR_POLICY = `
  query SearchSchoolRubricsForPolicy($schoolId: ID!, $filter: SearchRubricFilter, $page: Int, $size: Int) {
    searchSchoolRubrics(schoolId: $schoolId, filter: $filter, page: $page, size: $size) {
      content {
        id
        code
        name
        frameworkId
        languageId
      }
    }
  }
`;

// `requireLanguage` mặc định true (dialog tạo Policy: phải chọn Ngôn ngữ trước mới load Rubric,
// tránh bắn thừa request khi form chưa chọn gì). Trang danh sách/filter truyền false vì đã bỏ
// filter Ngôn ngữ riêng, Rubric ở đó load ngay không cần điều kiện.
export function useRubricSearchOptionsQuery(schoolId?: string, languageId?: string, requireLanguage = true) {
  return useQuery({
    queryKey: ['school-assessment-policy-rubric-options', schoolId, languageId],
    queryFn: async () => {
      const data = await graphQLRequest<{ searchSchoolRubrics: { content: RubricOption[] } }>(
        SEARCH_SCHOOL_RUBRICS_FOR_POLICY,
        { schoolId, filter: { languageId: languageId || null }, page: 1, size: 100 }
      );
      return data.searchSchoolRubrics.content;
    },
    enabled: Boolean(schoolId) && (!requireLanguage || Boolean(languageId)),
  });
}

// 2. Danh sách Rubric Version theo Rubric đã chọn (cho phép cả DRAFT lẫn PUBLISHED)
const GET_SCHOOL_RUBRIC_VERSIONS_FOR_POLICY = `
  query GetSchoolRubricVersionsForPolicy($schoolId: ID!, $rubricId: ID!, $page: Int, $size: Int) {
    viewSchoolRubricVersions(schoolId: $schoolId, rubricId: $rubricId, page: $page, size: $size) {
      content {
        id
        code
        name
        version
        status
        scoringScaleMin
        scoringScaleMax
      }
    }
  }
`;

export function useRubricVersionOptionsQuery(schoolId?: string, rubricId?: string) {
  return useQuery({
    queryKey: ['school-assessment-policy-rubric-version-options', schoolId, rubricId],
    queryFn: async () => {
      const data = await graphQLRequest<{ viewSchoolRubricVersions: { content: RubricVersionOption[] } }>(
        GET_SCHOOL_RUBRIC_VERSIONS_FOR_POLICY,
        { schoolId, rubricId, page: 1, size: 100 }
      );
      return data.viewSchoolRubricVersions.content;
    },
    enabled: Boolean(schoolId && rubricId),
  });
}
