// src/features/assessment_policy_school/api/useFilterOptionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { FrameworkOption, LanguageOption } from '../types';

// 1. Dành cho Framework (Khung năng lực)
// Lưu ý: query "frameworks" chỉ SYSTEM_ADMIN mới gọi được (PreAuthorize SYSTEM_ADMIN ở BE).
// School Admin phải dùng "schoolFrameworks" (chỉ trả về Framework đang active).
const GET_SCHOOL_FRAMEWORKS = `
  query GetSchoolFrameworks {
    schoolFrameworks(page: 1, size: 100) {
      content {
        id
        name
      }
    }
  }
`;

export function useFrameworkOptionsQuery() {
  return useQuery({
    queryKey: ['school-assessment-policy-framework-options'],
    queryFn: async () => {
      const data = await graphQLRequest<{ schoolFrameworks: { content: FrameworkOption[] } }>(GET_SCHOOL_FRAMEWORKS);
      return data.schoolFrameworks.content;
    },
    staleTime: 1000 * 60 * 60, // Cache 1 tiếng vì danh sách này ít đổi
  });
}

// 2. Dành cho Language (Ngôn ngữ)
const GET_LANGUAGES = `
  query GetLanguages {
    supportedLanguages(page: 1, size: 100) {
      content {
        id
        name
      }
    }
  }
`;

export function useLanguageOptionsQuery() {
  return useQuery({
    queryKey: ['school-assessment-policy-language-options'],
    queryFn: async () => {
      const data = await graphQLRequest<{ supportedLanguages: { content: LanguageOption[] } }>(GET_LANGUAGES);
      return data.supportedLanguages.content;
    },
    staleTime: 1000 * 60 * 60,
  });
}
