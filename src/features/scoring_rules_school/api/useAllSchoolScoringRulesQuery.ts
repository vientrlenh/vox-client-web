// src/features/scoring_rules_school/api/useAllSchoolScoringRulesQuery.ts
//
// Gộp Scoring Rule của TẤT CẢ Assessment Policy của trường thành 1 danh sách phẳng, kèm thông tin
// Assessment Policy mà mỗi rule thuộc về. BE không có query lấy Scoring Rule không giới hạn theo
// policyId (mọi query đều bắt buộc policyId), nên FE phải lấy danh sách Assessment Policy trước rồi
// gọi song song Scoring Rule cho từng Policy rồi gộp lại — cùng cách tiếp cận đã dùng cho Framework Version.

import { useQueries } from '@tanstack/react-query';
import { useSchoolAssessmentPoliciesQuery, type AssessmentPolicy } from '@/features/assessment_policy_school';
import { searchSchoolScoringRules, searchSchoolScoringRulesKeys } from './useSearchSchoolScoringRulesQuery';
import type { ScoringRule } from '../types';

const MAX_POLICIES = 100;
const MAX_RULES_PER_POLICY = 100;

export type ScoringRuleWithPolicy = ScoringRule & {
  policyLanguageName: string;
  policyScopeLabel: string;
  policyStatus: string;
};

function scopeLabel(policy: AssessmentPolicy) {
  const schoolLabel = policy.school?.name || policy.school?.code || 'Toàn trường';
  const narrowest = policy.schoolClass ?? policy.schoolGrade ?? policy.schoolGradeLevel;
  const narrowestLabel = narrowest?.name || narrowest?.code;
  return narrowestLabel ? `${schoolLabel} - ${narrowestLabel}` : schoolLabel;
}

export function useAllSchoolScoringRulesQuery(schoolId?: string) {
  const { data: policiesPage, isLoading: isLoadingPolicies } = useSchoolAssessmentPoliciesQuery(
    schoolId,
    { status: null, languageId: null },
    1,
    MAX_POLICIES
  );
  const policies = policiesPage?.content ?? [];

  const ruleQueries = useQueries({
    queries: policies.map((policy) => ({
      queryKey: searchSchoolScoringRulesKeys.list(schoolId || '', policy.id, '', '', 1, MAX_RULES_PER_POLICY),
      queryFn: () => searchSchoolScoringRules(schoolId!, policy.id, {}, 1, MAX_RULES_PER_POLICY),
      enabled: Boolean(schoolId),
    })),
  });

  const isLoading = isLoadingPolicies || ruleQueries.some((q) => q.isLoading);

  const data: ScoringRuleWithPolicy[] | undefined = schoolId
    ? policies.flatMap((policy, index) => {
        const rules = ruleQueries[index]?.data?.content ?? [];
        return rules.map((rule) => ({
          ...rule,
          policyLanguageName: policy.language?.name ?? '—',
          policyScopeLabel: scopeLabel(policy),
          policyStatus: policy.status,
        }));
      })
    : undefined;

  return { data, isLoading };
}
