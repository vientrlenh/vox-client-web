// src/features/assessment_policy_school/api/useSchoolAssessmentPolicyQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { AssessmentPolicyDetail } from '../types';

export const assessmentPolicyDetailQueryKeys = {
  all: ['school-assessment-policy-detail'] as const,
  detail: (schoolId: string, policyId: string) => [...assessmentPolicyDetailQueryKeys.all, schoolId, policyId] as const,
};

const GET_SCHOOL_ASSESSMENT_POLICY_DETAIL = `
  query GetSchoolAssessmentPolicyDetail($schoolId: ID!, $policyId: ID!) {
    viewSchoolAssessmentPolicy(schoolId: $schoolId, policyId: $policyId) {
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
        resultBands {
          id
          code
          label
          order
        }
      }
      rubricVersion {
        id
        rubricId
        code
        name
        version
        status
        effectiveFrom
        effectiveTo
        scoringScaleMin
        scoringScaleMax
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
      gradeLevel {
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

async function fetchSchoolAssessmentPolicyDetail(schoolId: string, policyId: string): Promise<AssessmentPolicyDetail | null> {
  const data = await graphQLRequest<{ viewSchoolAssessmentPolicy: AssessmentPolicyDetail | null }>(
    GET_SCHOOL_ASSESSMENT_POLICY_DETAIL,
    { schoolId, policyId }
  );

  return data.viewSchoolAssessmentPolicy;
}

export function useSchoolAssessmentPolicyQuery(schoolId?: string, policyId?: string) {
  return useQuery({
    queryKey: assessmentPolicyDetailQueryKeys.detail(schoolId || '', policyId || ''),
    queryFn: () => fetchSchoolAssessmentPolicyDetail(schoolId!, policyId!),
    enabled: Boolean(schoolId && policyId),
  });
}
