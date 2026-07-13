// src/features/assessment_policy_school/api/useUpdateSchoolAssessmentPolicyMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { assessmentPolicyQueryKeys } from './useSchoolAssessmentPoliciesQuery';
import type { UpdateAssessmentPolicyPayload } from '../types';

const UPDATE_SCHOOL_ASSESSMENT_POLICY = `
  mutation UpdateSchoolAssessmentPolicy($schoolId: ID!, $policyId: ID!, $input: UpdateAssessmentPolicyInput!) {
    updateSchoolAssessmentPolicy(schoolId: $schoolId, policyId: $policyId, input: $input)
  }
`;

type UpdateInput = {
  policyId: string;
  payload: UpdateAssessmentPolicyPayload;
};

export function useUpdateSchoolAssessmentPolicyMutation(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ policyId, payload }: UpdateInput) => {
      if (!schoolId) throw new Error('Không tìm thấy ID trường học');

      const data = await graphQLRequest<{ updateSchoolAssessmentPolicy: string }>(
        UPDATE_SCHOOL_ASSESSMENT_POLICY,
        { schoolId, policyId, input: payload }
      );
      return data.updateSchoolAssessmentPolicy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentPolicyQueryKeys.lists() });
    },
  });
}
