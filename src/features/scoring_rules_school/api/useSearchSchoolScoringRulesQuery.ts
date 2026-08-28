// src/features/scoring_rules_school/api/useSearchSchoolScoringRulesQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { ScoringRulePage } from '../types';

export const searchSchoolScoringRulesKeys = {
  all: ['search-school-scoring-rules'] as const,
  lists: () => [...searchSchoolScoringRulesKeys.all, 'list'] as const,
  list: (schoolId: string, policyId: string, keyword: string, isActive: string, page: number, size: number) =>
    [...searchSchoolScoringRulesKeys.lists(), schoolId, policyId, keyword, isActive, page, size] as const,
};

const SEARCH_SCHOOL_SCORING_RULES = `
  query SearchSchoolScoringRules($schoolId: ID!, $policyId: ID!, $keyword: String, $isActive: Boolean, $page: Int, $size: Int) {
    searchSchoolScoringRules(schoolId: $schoolId, policyId: $policyId, keyword: $keyword, isActive: $isActive, page: $page, size: $size) {
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

export async function searchSchoolScoringRules(
  schoolId: string,
  policyId: string,
  filter: SearchScoringRuleFilter,
  page: number,
  size: number
): Promise<ScoringRulePage> {
  const data = await graphQLRequest<{ searchSchoolScoringRules: ScoringRulePage }>(SEARCH_SCHOOL_SCORING_RULES, {
    schoolId,
    policyId,
    keyword: filter.keyword ?? null,
    isActive: filter.isActive ?? null,
    page,
    size,
  });

  const response = data.searchSchoolScoringRules;

  return response;
}

export function useSearchSchoolScoringRulesQuery(
  schoolId: string | undefined,
  policyId: string | undefined,
  filter: SearchScoringRuleFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: searchSchoolScoringRulesKeys.list(
      schoolId || '',
      policyId || '',
      filter.keyword ?? '',
      filter.isActive === undefined || filter.isActive === null ? '' : String(filter.isActive),
      page,
      size
    ),
    queryFn: () => searchSchoolScoringRules(schoolId!, policyId!, filter, page, size),
    enabled: Boolean(schoolId && policyId),
    placeholderData: (previousData) => previousData,
  });
}
