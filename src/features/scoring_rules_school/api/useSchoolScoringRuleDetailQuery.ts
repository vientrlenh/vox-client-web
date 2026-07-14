// src/features/scoring_rules_school/api/useSchoolScoringRuleDetailQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { ScoringRule } from '../types';

export const schoolScoringRuleDetailKeys = {
  all: ['school-scoring-rule-detail'] as const,
  detail: (schoolId: string, policyId: string, ruleId: string) =>
    [...schoolScoringRuleDetailKeys.all, schoolId, policyId, ruleId] as const,
};

const VIEW_SCHOOL_SCORING_RULE_DETAIL = `
  query ViewSchoolScoringRuleDetail($schoolId: ID!, $policyId: ID!, $ruleId: ID!) {
    viewSchoolScoringRuleDetails(schoolId: $schoolId, policyId: $policyId, ruleId: $ruleId) {
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
  }
`;

async function fetchSchoolScoringRuleDetail(schoolId: string, policyId: string, ruleId: string): Promise<ScoringRule> {
  const data = await graphQLRequest<{ viewSchoolScoringRuleDetails: ScoringRule }>(VIEW_SCHOOL_SCORING_RULE_DETAIL, {
    schoolId,
    policyId,
    ruleId,
  });

  return data.viewSchoolScoringRuleDetails;
}

export function useSchoolScoringRuleDetailQuery(
  schoolId: string | undefined,
  policyId: string | undefined,
  ruleId: string | undefined
) {
  return useQuery({
    queryKey: schoolScoringRuleDetailKeys.detail(schoolId || '', policyId || '', ruleId || ''),
    queryFn: () => fetchSchoolScoringRuleDetail(schoolId!, policyId!, ruleId!),
    enabled: Boolean(schoolId && policyId && ruleId),
  });
}
