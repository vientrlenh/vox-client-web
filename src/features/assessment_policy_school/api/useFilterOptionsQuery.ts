// src/features/assessment_policy_school/api/useFilterOptionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { FrameworkOption, LanguageOption } from '../types';

// 1. Dành cho Framework (Khung năng lực)
// Lưu ý: BE đã gộp "frameworks" thành 1 query dùng chung cho cả SYSTEM_ADMIN lẫn SCHOOL_ADMIN.
// "schoolFrameworks" vẫn còn khai báo trong schema .graphqls nhưng KHÔNG còn resolver nào
// implement (đã bị xoá khỏi FrameworkController) — gọi vào sẽ lỗi/trả null, nên phải dùng
// "frameworks" kèm isActive: true để chỉ lấy Framework đang active.
const GET_SCHOOL_FRAMEWORKS = `
  query GetSchoolFrameworks {
    frameworks(page: 1, size: 100, isActive: true) {
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
      const data = await graphQLRequest<{ frameworks: { content: FrameworkOption[] } }>(GET_SCHOOL_FRAMEWORKS);
      return data.frameworks.content;
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
