// src/features/assessment_policy_school/api/useSchoolAssessmentPoliciesQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { AssessmentPolicyPage } from '../types';

export type SchoolAssessmentPolicyFilter = {
  status?: string | null;
  languageId?: string | null;
  rubricVersionId?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

export const assessmentPolicyQueryKeys = {
  all: ['school-assessment-policies'] as const,
  lists: () => [...assessmentPolicyQueryKeys.all, 'list'] as const,
  list: (schoolId: string, filter: SchoolAssessmentPolicyFilter, page: number, size: number) =>
    [...assessmentPolicyQueryKeys.lists(), schoolId, filter, page, size] as const,
};

const GET_SCHOOL_ASSESSMENT_POLICIES = `
  query GetSchoolAssessmentPolicies($schoolId: ID!, $status: String, $languageId: ID, $rubricVersionId: ID, $effectiveFrom: String, $effectiveTo: String, $page: Int, $size: Int) {
    viewSchoolAssessmentPolicies(schoolId: $schoolId, status: $status, languageId: $languageId, rubricVersionId: $rubricVersionId, effectiveFrom: $effectiveFrom, effectiveTo: $effectiveTo, page: $page, size: $size) {
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
          resultBands {
            id
            code
            label
            order
          }
        }
        rubricVersion {
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
          code
          label
        }
        school {
          id
          code
          name
        }
        gradeLevel {
          id
          code
          name
        }
        schoolGrade {
          id
          code
          name
        }
        schoolClass {
          id
          code
          name
        }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`;

async function fetchSchoolAssessmentPolicies(
  schoolId: string,
  filter: SchoolAssessmentPolicyFilter,
  page: number,
  size: number
): Promise<AssessmentPolicyPage> {
  const data = await graphQLRequest<{ viewSchoolAssessmentPolicies: AssessmentPolicyPage }>(
    GET_SCHOOL_ASSESSMENT_POLICIES,
    {
      schoolId,
      status: filter.status || null,
      languageId: filter.languageId || null,
      rubricVersionId: filter.rubricVersionId || null,
      effectiveFrom: filter.effectiveFrom || null,
      effectiveTo: filter.effectiveTo || null,
      page,
      size,
    }
  );

  const response = data.viewSchoolAssessmentPolicies;

  return {
    ...response,
    page: response.page + 1,
  };
}

export function useSchoolAssessmentPoliciesQuery(
  schoolId: string | undefined,
  filter: SchoolAssessmentPolicyFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: assessmentPolicyQueryKeys.list(schoolId || '', filter, page, size),
    queryFn: () => fetchSchoolAssessmentPolicies(schoolId!, filter, page, size),
    enabled: Boolean(schoolId),
    placeholderData: (previousData) => previousData,
  });
}
