import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { SchoolGrade, SchoolGradePage } from '../types'

const SCHOOL_GRADE_FIELDS = `
  id
  code
  name
  description
  startDate
  endDate
  status
  createdAt
  updatedAt
`

const SCHOOL_GRADES_QUERY = `
  query SchoolGrades($schoolId: ID!, $gradeLevelId: ID, $page: Int, $size: Int) {
    schoolGrades(schoolId: $schoolId, gradeLevelId: $gradeLevelId, page: $page, size: $size) {
      content {
        ${SCHOOL_GRADE_FIELDS}
      }
      totalElements
      totalPages
      page
      size
    }
  }
`

const SCHOOL_GRADE_QUERY = `
  query SchoolGrade($schoolId: ID!, $id: ID!) {
    schoolGrade(schoolId: $schoolId, id: $id) {
      ${SCHOOL_GRADE_FIELDS}
    }
  }
`

type SchoolGradesQueryData = {
  schoolGrades: SchoolGradePage
}

type SchoolGradeQueryData = {
  schoolGrade: SchoolGrade
}

export const gradeManagementQueryKeys = {
  all: ['grade-management'] as const,
  detail: (id: string) => [...gradeManagementQueryKeys.all, 'detail', id] as const,
  grades: (page: number, size: number, gradeLevelId?: string) =>
    [...gradeManagementQueryKeys.all, 'list', page, size, gradeLevelId] as const,
}

export async function fetchSchoolGrades(page: number, size: number, gradeLevelId?: string) {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<SchoolGradesQueryData>(SCHOOL_GRADES_QUERY, {
    gradeLevelId: gradeLevelId || undefined,
    page,
    schoolId,
    size,
  })

  return data.schoolGrades
}

export async function fetchSchoolGrade(id: string) {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<SchoolGradeQueryData>(SCHOOL_GRADE_QUERY, { id, schoolId })
  return data.schoolGrade
}

export function useSchoolGradesQuery(page: number, size: number, gradeLevelId?: string) {
  return useQuery({
    queryFn: () => fetchSchoolGrades(page, size, gradeLevelId),
    queryKey: gradeManagementQueryKeys.grades(page, size, gradeLevelId),
  })
}

export function useSchoolGradeQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchSchoolGrade(id!),
    queryKey: gradeManagementQueryKeys.detail(id ?? ''),
  })
}
