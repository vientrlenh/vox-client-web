// src/features/assessment_policy_system/api/useSystemAssessmentPoliciesQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { AssessmentPolicyPage } from '../types';

export type SystemAssessmentPolicyFilter = {
  status?: string | null;
  languageId?: string | null;
  rubricVersionId?: string | null;
};

export const assessmentPolicyQueryKeys = {
  all: ['system-assessment-policies'] as const,
  lists: () => [...assessmentPolicyQueryKeys.all, 'list'] as const,
  list: (filter: SystemAssessmentPolicyFilter, page: number, size: number) =>
    [...assessmentPolicyQueryKeys.lists(), filter, page, size] as const,
};

const GET_SYSTEM_ASSESSMENT_POLICIES = `
  query GetSystemAssessmentPolicies($status: String, $languageId: ID, $rubricVersionId: ID, $page: Int, $size: Int) {
    viewSystemAssessmentPolicies(status: $status, languageId: $languageId, rubricVersionId: $rubricVersionId, page: $page, size: $size) {
      content {
        id
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
          name
        }
        frameworkVersion {
          code
          name
          version
          status
          effectiveFrom
          effectiveTo
        }
        rubricVersion {
          code
          name
          version
          status
          effectiveFrom
          effectiveTo
        }
        targetFrameworkBand {
          code
          label
        }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`;

async function fetchSystemAssessmentPolicies(
  filter: SystemAssessmentPolicyFilter,
  page: number,
  size: number
): Promise<AssessmentPolicyPage> {
  const data = await graphQLRequest<{ viewSystemAssessmentPolicies: AssessmentPolicyPage }>(
    GET_SYSTEM_ASSESSMENT_POLICIES,
    {
      status: filter.status || null,
      languageId: filter.languageId || null,
      rubricVersionId: filter.rubricVersionId || null,
      page,
      size,
    }
  );

  const response = data.viewSystemAssessmentPolicies;

  return {
    ...response,
    page: response.page + 1,
  };
}

export function useSystemAssessmentPoliciesQuery(
  filter: SystemAssessmentPolicyFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: assessmentPolicyQueryKeys.list(filter, page, size),
    queryFn: () => fetchSystemAssessmentPolicies(filter, page, size),
    placeholderData: (previousData) => previousData,
  });
}
