// src/features/assessment_policy_system/api/useFilterOptionsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { FrameworkOption, LanguageOption } from '../types';

// 1. Dành cho Framework (Khung năng lực)
const GET_FRAMEWORKS = `
  query GetFrameworks {
    frameworks(page: 1, size: 100) {
      content {
        id
        name
      }
    }
  }
`;

export function useFrameworkOptionsQuery() {
  return useQuery({
    queryKey: ['assessment-policy-framework-options'],
    queryFn: async () => {
      const data = await graphQLRequest<{ frameworks: { content: FrameworkOption[] } }>(GET_FRAMEWORKS);
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
    queryKey: ['assessment-policy-language-options'],
    queryFn: async () => {
      const data = await graphQLRequest<{ supportedLanguages: { content: LanguageOption[] } }>(GET_LANGUAGES);
      return data.supportedLanguages.content;
    },
    staleTime: 1000 * 60 * 60,
  });
}
