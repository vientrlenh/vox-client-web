// src/features/scoring_rules_system/api/useSystemScoringRuleDetailQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { ScoringRule } from '../types';

export const systemScoringRuleDetailKeys = {
  all: ['system-scoring-rule-detail'] as const,
  detail: (policyId: string, ruleId: string) =>
    [...systemScoringRuleDetailKeys.all, policyId, ruleId] as const,
};

const VIEW_SYSTEM_SCORING_RULE_DETAIL = `
  query ViewSystemScoringRuleDetail($policyId: ID!, $ruleId: ID!) {
    viewSystemScoringRuleDetails(policyId: $policyId, ruleId: $ruleId) {
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

async function fetchSystemScoringRuleDetail(policyId: string, ruleId: string): Promise<ScoringRule> {
  const data = await graphQLRequest<{ viewSystemScoringRuleDetails: ScoringRule }>(VIEW_SYSTEM_SCORING_RULE_DETAIL, {
    policyId,
    ruleId,
  });

  return data.viewSystemScoringRuleDetails;
}

export function useSystemScoringRuleDetailQuery(
  policyId: string | undefined,
  ruleId: string | undefined
) {
  return useQuery({
    queryKey: systemScoringRuleDetailKeys.detail(policyId || '', ruleId || ''),
    queryFn: () => fetchSystemScoringRuleDetail(policyId!, ruleId!),
    enabled: Boolean(policyId && ruleId),
  });
}
