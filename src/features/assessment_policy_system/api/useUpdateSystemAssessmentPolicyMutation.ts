// src/features/assessment_policy_system/api/useUpdateSystemAssessmentPolicyMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import { assessmentPolicyQueryKeys } from './useSystemAssessmentPoliciesQuery';
import type { UpdateAssessmentPolicyPayload } from '../types';

const UPDATE_SYSTEM_ASSESSMENT_POLICY = `
  mutation UpdateSystemAssessmentPolicy($policyId: ID!, $input: UpdateAssessmentPolicyInput!) {
    updateSystemAssessmentPolicy(policyId: $policyId, input: $input)
  }
`;

type UpdateInput = {
  policyId: string;
  payload: UpdateAssessmentPolicyPayload;
};

export function useUpdateSystemAssessmentPolicyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ policyId, payload }: UpdateInput) => {
      const data = await graphQLRequest<{ updateSystemAssessmentPolicy: string }>(
        UPDATE_SYSTEM_ASSESSMENT_POLICY,
        { policyId, input: payload }
      );
      return data.updateSystemAssessmentPolicy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentPolicyQueryKeys.lists() });
    },
  });
}
