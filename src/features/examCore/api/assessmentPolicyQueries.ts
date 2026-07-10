import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { AssessmentPolicyDto, Paged } from '../types'
import { examQueryKeys } from './queries'

const ASSESSMENT_POLICY_FIELDS = `
  id
  languageId
  rubricVersionId
  passingScore
  strictness
  version
  status
  effectiveFrom
  effectiveTo
  rubricVersion {
    id
    rubricId
    version
    code
    name
    status
  }
`

const MATCHING_SCHOOL_ASSESSMENT_POLICIES_QUERY = `
  query MatchingSchoolAssessmentPolicies($schoolId: ID!, $languageId: ID, $rubricVersionId: ID) {
    viewSchoolAssessmentPolicies(schoolId: $schoolId, status: "PUBLISHED", languageId: $languageId, rubricVersionId: $rubricVersionId) {
      content {
        ${ASSESSMENT_POLICY_FIELDS}
      }
    }
  }
`

async function fetchMatchingSchoolAssessmentPolicies(filters: { languageId: string; rubricVersionId: string }) {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<{ viewSchoolAssessmentPolicies: Paged<AssessmentPolicyDto> }>(
    MATCHING_SCHOOL_ASSESSMENT_POLICIES_QUERY,
    { languageId: filters.languageId, rubricVersionId: filters.rubricVersionId, schoolId },
  )
  return data.viewSchoolAssessmentPolicies.content
}

export function useMatchingSchoolAssessmentPoliciesQuery(filters: { languageId?: string | null; rubricVersionId?: string | null }) {
  return useQuery({
    enabled: Boolean(filters.languageId && filters.rubricVersionId),
    queryFn: () =>
      fetchMatchingSchoolAssessmentPolicies({
        languageId: filters.languageId as string,
        rubricVersionId: filters.rubricVersionId as string,
      }),
    queryKey: [...examQueryKeys.all, 'matching-assessment-policies', filters.languageId, filters.rubricVersionId],
  })
}
