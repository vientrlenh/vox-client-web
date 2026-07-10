import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { Paged, RubricDto } from '../types'
import { examQueryKeys } from './queries'

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

export function useSchoolRubricsWithPublishedVersionsQuery(filters: { keyword?: string; languageId?: string | null }) {
  return useQuery({
    queryFn: () => fetchSchoolRubricsWithPublishedVersions(filters),
    queryKey: [...examQueryKeys.all, 'school-rubrics-published', filters],
  })
}
