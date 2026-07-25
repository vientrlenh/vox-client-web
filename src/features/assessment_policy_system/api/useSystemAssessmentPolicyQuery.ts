// src/features/assessment_policy_system/api/useSystemAssessmentPolicyQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { AssessmentPolicyDetail } from '../types';

export const assessmentPolicyDetailQueryKeys = {
  all: ['system-assessment-policy-detail'] as const,
  detail: (policyId: string) => [...assessmentPolicyDetailQueryKeys.all, policyId] as const,
};

const GET_SYSTEM_ASSESSMENT_POLICY_DETAIL = `
  query GetSystemAssessmentPolicyDetail($policyId: ID!) {
    viewSystemAssessmentPolicy(policyId: $policyId) {
      id
      schoolId
      languageId
      frameworkVersionId
      rubricVersionId
      targetFrameworkBandId
      passingScore
      strictness
      version
      status
      effectiveFrom
      effectiveTo
      createdAt
      updatedAt
      language {
        id
        name
      }
      frameworkVersion {
        id
        code
        name
        version
        status
        effectiveFrom
        effectiveTo
      }
      rubricVersion {
        id
        code
        name
        version
        status
        effectiveFrom
        effectiveTo
      }
      targetFrameworkBand {
        id
        code
        label
        description
        order
      }
      school {
        id
        name
        code
      }
      schoolGradeLevel {
        id
        name
        code
      }
      schoolGrade {
        id
        name
        code
      }
      schoolClass {
        id
        name
        code
      }
    }
  }
`;

async function fetchSystemAssessmentPolicyDetail(policyId: string): Promise<AssessmentPolicyDetail | null> {
  const data = await graphQLRequest<{ viewSystemAssessmentPolicy: AssessmentPolicyDetail | null }>(
    GET_SYSTEM_ASSESSMENT_POLICY_DETAIL,
    { policyId }
  );

  return data.viewSystemAssessmentPolicy;
}

export function useSystemAssessmentPolicyQuery(policyId?: string) {
  return useQuery({
    queryKey: assessmentPolicyDetailQueryKeys.detail(policyId || ''),
    queryFn: () => fetchSystemAssessmentPolicyDetail(policyId!),
    enabled: Boolean(policyId),
  });
}
