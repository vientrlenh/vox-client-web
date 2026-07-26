// src/features/scoring_rules_system/api/useSearchSystemScoringRulesQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { ScoringRulePage } from '../types';

export const searchSystemScoringRulesKeys = {
  all: ['search-system-scoring-rules'] as const,
  lists: () => [...searchSystemScoringRulesKeys.all, 'list'] as const,
  list: (policyId: string, keyword: string, isActive: string, page: number, size: number) =>
    [...searchSystemScoringRulesKeys.lists(), policyId, keyword, isActive, page, size] as const,
};

const SEARCH_SYSTEM_SCORING_RULES = `
  query SearchSystemScoringRules($policyId: ID!, $keyword: String, $isActive: Boolean, $page: Int, $size: Int) {
    searchSystemScoringRules(policyId: $policyId, keyword: $keyword, isActive: $isActive, page: $page, size: $size) {
      content {
        id
        policyId
        code
        name
        description
        conditionType
        conditionParamsJson
        actionType
        actionParamsJson
        priority
        severity
        stopProcessing
        isActive
        createdAt
        updatedAt
      }
      page
      size
      totalElements
      totalPages
    }
  }
`;

export type SearchScoringRuleFilter = {
  keyword?: string | null;
  isActive?: boolean | null;
};

export async function searchSystemScoringRules(
  policyId: string,
  filter: SearchScoringRuleFilter,
  page: number,
  size: number
): Promise<ScoringRulePage> {
  const data = await graphQLRequest<{ searchSystemScoringRules: ScoringRulePage }>(SEARCH_SYSTEM_SCORING_RULES, {
    policyId,
    keyword: filter.keyword ?? null,
    isActive: filter.isActive ?? null,
    page,
    size,
  });

  const response = data.searchSystemScoringRules;

  return {
    ...response,
    page: response.page + 1, // Bù trừ 0-based từ Backend lên 1-based cho Pagination UI
  };
}

export function useSearchSystemScoringRulesQuery(
  policyId: string | undefined,
  filter: SearchScoringRuleFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: searchSystemScoringRulesKeys.list(
      policyId || '',
      filter.keyword ?? '',
      filter.isActive === undefined || filter.isActive === null ? '' : String(filter.isActive),
      page,
      size
    ),
    queryFn: () => searchSystemScoringRules(policyId!, filter, page, size),
    enabled: Boolean(policyId),
    placeholderData: (previousData) => previousData,
  });
}
