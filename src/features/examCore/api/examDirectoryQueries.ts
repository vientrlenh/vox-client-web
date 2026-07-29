// Danh bạ nguồn thí sinh / giám thị của một kỳ thi.
//
// Tách khỏi các query quản trị (`schoolClasses`, `schoolGrades`, `schoolStudentsBySchool`,
// `schoolTeachersBySchool`) vì những query đó gated `hasRole('SCHOOL_ADMIN')` ở BE: giáo
// viên là chủ tịch hội đồng được phép NHẬP thí sinh nhưng không đọc nổi danh sách để chọn.
// Bốn query dưới đây nhận `examId` và tự suy quyền từ vai trò của người gọi trong chính kỳ
// thi đó, nên dùng chung được cho cả school admin lẫn chủ tịch.

import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { Paged } from '../types'
import { examQueryKeys } from './queries'

export type ExamDirectoryClass = {
  id: string
  schoolId: string
  languageId: string
  schoolGradeId: string
  code: string
  name: string
  description: string | null
  status: string
}

export type ExamDirectoryGrade = {
  id: string
  code: string
  name: string
  status: string
}

export type ExamDirectoryUser = {
  userId: string
  fullName: string | null
  email: string | null
  status: string
}

type ExamDirectoryVariables = {
  examId: string
  page: number
  search: string | null
  size: number
}

const PAGE_FIELDS = `
  page
  size
  totalElements
  totalPages
`

const EXAM_DIRECTORY_CLASSES_QUERY = `
  query ExamDirectoryClasses($examId: ID!, $search: String, $page: Int!, $size: Int!) {
    examDirectoryClasses(examId: $examId, search: $search, page: $page, size: $size) {
      content {
        id
        schoolId
        languageId
        schoolGradeId
        code
        name
        description
        status
      }
      ${PAGE_FIELDS}
    }
  }
`

const EXAM_DIRECTORY_GRADES_QUERY = `
  query ExamDirectoryGrades($examId: ID!, $search: String, $page: Int!, $size: Int!) {
    examDirectoryGrades(examId: $examId, search: $search, page: $page, size: $size) {
      content {
        id
        code
        name
        status
      }
      ${PAGE_FIELDS}
    }
  }
`

const EXAM_DIRECTORY_USER_FIELDS = `
  content {
    userId
    fullName
    email
    status
  }
  ${PAGE_FIELDS}
`

const EXAM_DIRECTORY_STUDENTS_QUERY = `
  query ExamDirectoryStudents($examId: ID!, $search: String, $page: Int!, $size: Int!) {
    examDirectoryStudents(examId: $examId, search: $search, page: $page, size: $size) {
      ${EXAM_DIRECTORY_USER_FIELDS}
    }
  }
`

const EXAM_DIRECTORY_PROCTORS_QUERY = `
  query ExamDirectoryProctors($examId: ID!, $search: String, $page: Int!, $size: Int!) {
    examDirectoryProctors(examId: $examId, search: $search, page: $page, size: $size) {
      ${EXAM_DIRECTORY_USER_FIELDS}
    }
  }
`

export const examDirectoryQueryKeys = {
  classes: (examId: string, page: number, size: number, search: string) =>
    [...examQueryKeys.all, 'directory', 'classes', examId, page, size, search] as const,
  grades: (examId: string, page: number, size: number, search: string) =>
    [...examQueryKeys.all, 'directory', 'grades', examId, page, size, search] as const,
  proctors: (examId: string, page: number, size: number, search: string) =>
    [...examQueryKeys.all, 'directory', 'proctors', examId, page, size, search] as const,
  students: (examId: string, page: number, size: number, search: string) =>
    [...examQueryKeys.all, 'directory', 'students', examId, page, size, search] as const,
}

async function fetchDirectory<T>(
  query: string,
  field: string,
  variables: ExamDirectoryVariables,
): Promise<Paged<T>> {
  const data = await graphQLRequest<Record<string, Paged<T>>>(query, variables)
  return data[field]
}

function variables(examId: string, page: number, size: number, search: string): ExamDirectoryVariables {
  return { examId, page, search: search.trim() || null, size }
}

export function useExamDirectoryClassesQuery(examId: string, page: number, size: number, search: string) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () =>
      fetchDirectory<ExamDirectoryClass>(
        EXAM_DIRECTORY_CLASSES_QUERY,
        'examDirectoryClasses',
        variables(examId, page, size, search),
      ),
    queryKey: examDirectoryQueryKeys.classes(examId, page, size, search),
  })
}

/**
 * Chỉ dùng được cho kỳ thi tập trung — bài trên lớp bị BE từ chối bằng `FORBIDDEN`.
 * Call-site phải ẩn hẳn lối vào này khi `exam.kind === 'CLASS_TEST'`.
 */
export function useExamDirectoryGradesQuery(
  examId: string,
  page: number,
  size: number,
  search: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    enabled: Boolean(examId) && (options?.enabled ?? true),
    queryFn: () =>
      fetchDirectory<ExamDirectoryGrade>(
        EXAM_DIRECTORY_GRADES_QUERY,
        'examDirectoryGrades',
        variables(examId, page, size, search),
      ),
    queryKey: examDirectoryQueryKeys.grades(examId, page, size, search),
  })
}

export function useExamDirectoryStudentsQuery(examId: string, page: number, size: number, search: string) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () =>
      fetchDirectory<ExamDirectoryUser>(
        EXAM_DIRECTORY_STUDENTS_QUERY,
        'examDirectoryStudents',
        variables(examId, page, size, search),
      ),
    queryKey: examDirectoryQueryKeys.students(examId, page, size, search),
  })
}

export function useExamDirectoryProctorsQuery(examId: string, page: number, size: number, search: string) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () =>
      fetchDirectory<ExamDirectoryUser>(
        EXAM_DIRECTORY_PROCTORS_QUERY,
        'examDirectoryProctors',
        variables(examId, page, size, search),
      ),
    queryKey: examDirectoryQueryKeys.proctors(examId, page, size, search),
  })
}
