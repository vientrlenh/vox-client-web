// src/features/rubrics/api/useFilterOptionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';

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
    queryKey: ['framework-options'],
    queryFn: async () => {
      // Đổi tên key hứng data trả về cho khớp với tên Query
      const data = await graphQLRequest<{ schoolFrameworks: { content: { id: string; name: string }[] } }>(GET_SCHOOL_FRAMEWORKS);
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
    queryKey: ['language-options'],
    queryFn: async () => {
      // Đổi tên key hứng data trả về cho khớp với tên Query
      const data = await graphQLRequest<{ supportedLanguages: { content: { id: string; name: string }[] } }>(GET_LANGUAGES);
      return data.supportedLanguages.content;
    },
    staleTime: 1000 * 60 * 60, // Cache 1 tiếng
  });
}