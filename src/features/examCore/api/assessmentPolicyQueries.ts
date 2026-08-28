import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { AssessmentPolicyDto, Paged } from '../types'
import { examReferenceQueryKeys } from './queries'

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
  targetFrameworkBand {
    code
    label
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

async function fetchMatchingSchoolAssessmentPolicies(filters: { languageId?: string | null; rubricVersionId: string }) {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<{ viewSchoolAssessmentPolicies: Paged<AssessmentPolicyDto> }>(
    MATCHING_SCHOOL_ASSESSMENT_POLICIES_QUERY,
    { languageId: filters.languageId ?? null, rubricVersionId: filters.rubricVersionId, schoolId },
  )
  return data.viewSchoolAssessmentPolicies.content
}

// languageId is optional: some creation flows (e.g. class tests) have no language field of their own,
// so matching falls back to rubricVersionId alone.
export function useMatchingSchoolAssessmentPoliciesQuery(
  filters: { languageId?: string | null; rubricVersionId?: string | null },
  options?: { enabled?: boolean },
) {
  return useQuery({
    enabled: Boolean(filters.rubricVersionId) && (options?.enabled ?? true),
    queryFn: () =>
      fetchMatchingSchoolAssessmentPolicies({
        languageId: filters.languageId,
        rubricVersionId: filters.rubricVersionId as string,
      }),
    queryKey: [...examReferenceQueryKeys.all, 'matching-assessment-policies', filters.languageId, filters.rubricVersionId],
  })
}

const MATCHING_TEACHER_ASSESSMENT_POLICIES_QUERY = `
  query MatchingTeacherAssessmentPolicies($languageId: ID, $rubricVersionId: ID) {
    viewTeacherAssessmentPolicies(languageId: $languageId, rubricVersionId: $rubricVersionId) {
      content {
        ${ASSESSMENT_POLICY_FIELDS}
      }
    }
  }
`

async function fetchMatchingTeacherAssessmentPolicies(filters: { languageId?: string | null; rubricVersionId: string }) {
  const data = await graphQLRequest<{ viewTeacherAssessmentPolicies: Paged<AssessmentPolicyDto> }>(
    MATCHING_TEACHER_ASSESSMENT_POLICIES_QUERY,
    { languageId: filters.languageId ?? null, rubricVersionId: filters.rubricVersionId },
  )
  return data.viewTeacherAssessmentPolicies.content
}

// Teacher scope: BE infers schoolId from the token, so no schoolId argument here.
export function useMatchingTeacherAssessmentPoliciesQuery(
  filters: { languageId?: string | null; rubricVersionId?: string | null },
  options?: { enabled?: boolean },
) {
  return useQuery({
    enabled: Boolean(filters.rubricVersionId) && (options?.enabled ?? true),
    queryFn: () =>
      fetchMatchingTeacherAssessmentPolicies({
        languageId: filters.languageId,
        rubricVersionId: filters.rubricVersionId as string,
      }),
    queryKey: [...examReferenceQueryKeys.all, 'matching-teacher-assessment-policies', filters.languageId, filters.rubricVersionId],
  })
}
