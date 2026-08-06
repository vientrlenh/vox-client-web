import { useQueries, useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { Paged, RubricDto } from '../types'
import { examReferenceQueryKeys } from './queries'

const RUBRIC_VERSION_FIELDS = `
  id
  rubricId
  version
  code
  name
  status
`

const RUBRIC_WITH_PUBLISHED_VERSIONS_FIELDS = `
  id
  code
  name
  languageId
  frameworkId
  versions(status: "PUBLISHED", size: 50) {
    content {
      ${RUBRIC_VERSION_FIELDS}
    }
  }
`

const SEARCH_SCHOOL_RUBRICS_QUERY = `
  query SearchSchoolRubrics($schoolId: ID!, $filter: SearchRubricFilter, $page: Int, $size: Int) {
    searchSchoolRubrics(schoolId: $schoolId, filter: $filter, page: $page, size: $size) {
      content {
        ${RUBRIC_WITH_PUBLISHED_VERSIONS_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

type RawRubric = Omit<RubricDto, 'versions'> & { versions: { content: RubricDto['versions'] } }

async function fetchSchoolRubricsWithPublishedVersions(filters: { keyword?: string; languageId?: string | null }) {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<{ searchSchoolRubrics: Paged<RawRubric> }>(SEARCH_SCHOOL_RUBRICS_QUERY, {
    filter: { keyword: filters.keyword?.trim() || null, languageId: filters.languageId || null },
    page: 1,
    schoolId,
    size: 100,
  })
  return data.searchSchoolRubrics.content.map((rubric) => ({ ...rubric, versions: rubric.versions.content }))
}

// `options.enabled` cho phép component dùng chung gọi cả hai scope (school/teacher) mà chỉ một
// scope thực sự bắn request — query school-admin sẽ 403 nếu chạy dưới token giáo viên.
export function useSchoolRubricsWithPublishedVersionsQuery(
  filters: { keyword?: string; languageId?: string | null },
  options?: { enabled?: boolean },
) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryFn: () => fetchSchoolRubricsWithPublishedVersions(filters),
    queryKey: [...examReferenceQueryKeys.all, 'school-rubrics-published', filters],
  })
}

export type RubricSummaryDto = Omit<RubricDto, 'versions'>

const RUBRIC_SUMMARY_FIELDS = `
  id
  code
  name
  languageId
  frameworkId
`

const SEARCH_TEACHER_RUBRICS_QUERY = `
  query SearchTeacherRubrics($filter: SearchRubricFilter, $page: Int, $size: Int) {
    searchTeacherRubrics(filter: $filter, page: $page, size: $size) {
      content {
        ${RUBRIC_SUMMARY_FIELDS}
      }
    }
  }
`

async function fetchTeacherRubrics(filters: { keyword?: string; languageId?: string | null }) {
  const data = await graphQLRequest<{ searchTeacherRubrics: Paged<RubricSummaryDto> }>(SEARCH_TEACHER_RUBRICS_QUERY, {
    filter: { keyword: filters.keyword?.trim() || null, languageId: filters.languageId || null },
    page: 1,
    size: 100,
  })
  return data.searchTeacherRubrics.content
}

// Teacher scope: BE infers schoolId from the token, so no schoolId argument here (unlike the school-admin query above).
export function useTeacherRubricsQuery(
  filters: { keyword?: string; languageId?: string | null },
  options?: { enabled?: boolean },
) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryFn: () => fetchTeacherRubrics(filters),
    queryKey: [...examReferenceQueryKeys.all, 'teacher-rubrics', filters],
  })
}

const VIEW_TEACHER_RUBRIC_VERSIONS_QUERY = `
  query ViewTeacherRubricVersions($rubricId: ID!, $page: Int, $size: Int) {
    viewTeacherRubricVersions(rubricId: $rubricId, page: $page, size: $size) {
      content {
        ${RUBRIC_VERSION_FIELDS}
      }
    }
  }
`

async function fetchTeacherRubricVersions(rubricId: string) {
  const data = await graphQLRequest<{ viewTeacherRubricVersions: Paged<RubricDto['versions'][number]> }>(
    VIEW_TEACHER_RUBRIC_VERSIONS_QUERY,
    { page: 1, rubricId, size: 50 },
  )
  return data.viewTeacherRubricVersions.content
}

// viewTeacherRubricVersions already filters to PUBLISHED server-side, so no status argument is needed here.
// One query per rubricId, fetched in parallel, so a rubric list can show every rubric's published
// versions inline immediately — matching the school-admin picker, which gets them nested in one call.
export function useTeacherRubricVersionsQueries(rubricIds: string[]) {
  return useQueries({
    queries: rubricIds.map((rubricId) => ({
      queryFn: () => fetchTeacherRubricVersions(rubricId),
      queryKey: [...examReferenceQueryKeys.all, 'teacher-rubric-versions', rubricId],
    })),
  })
}
