// src/features/scoring_rules_system/api/useAllSystemScoringRulesQuery.ts
//
// Gộp Scoring Rule của TẤT CẢ Assessment Policy hệ thống thành 1 danh sách phẳng, kèm thông tin
// Assessment Policy mà mỗi rule thuộc về. BE không có query lấy Scoring Rule không giới hạn theo
// policyId (mọi query đều bắt buộc policyId), nên FE phải lấy danh sách Assessment Policy trước rồi
// gọi song song Scoring Rule cho từng Policy rồi gộp lại — cùng cách tiếp cận đã dùng cho Framework Version.

import { useQueries } from '@tanstack/react-query';
import { useSystemAssessmentPoliciesQuery, type AssessmentPolicy } from '@/features/assessment_policy_system';
import { searchSystemScoringRules, searchSystemScoringRulesKeys } from './useSearchSystemScoringRulesQuery';
import type { ScoringRule } from '../types';

const MAX_POLICIES = 100;
const MAX_RULES_PER_POLICY = 100;

export type ScoringRuleWithPolicy = ScoringRule & {
  policyLanguageName: string;
  policyScopeLabel: string;
  policyStatus: string;
};

function scopeLabel(policy: AssessmentPolicy) {
  return policy.frameworkVersion?.name || policy.frameworkVersion?.code || `Version ${policy.version}`;
}

export function useAllSystemScoringRulesQuery() {
  const { data: policiesPage, isLoading: isLoadingPolicies } = useSystemAssessmentPoliciesQuery(
    { status: null, languageId: null },
    1,
    MAX_POLICIES
  );
  const policies = policiesPage?.content ?? [];

  const ruleQueries = useQueries({
    queries: policies.map((policy) => ({
      queryKey: searchSystemScoringRulesKeys.list(policy.id, '', '', 1, MAX_RULES_PER_POLICY),
      queryFn: () => searchSystemScoringRules(policy.id, {}, 1, MAX_RULES_PER_POLICY),
    })),
  });

  const isLoading = isLoadingPolicies || ruleQueries.some((q) => q.isLoading);

  const data: ScoringRuleWithPolicy[] = policies.flatMap((policy, index) => {
    const rules = ruleQueries[index]?.data?.content ?? [];
    return rules.map((rule) => ({
      ...rule,
      policyLanguageName: policy.language?.name ?? '—',
      policyScopeLabel: scopeLabel(policy),
      policyStatus: policy.status,
    }));
  });

  return { data, isLoading };
}
