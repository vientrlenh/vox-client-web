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
  excludeUserIds?: string[]
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

// `excludeUserIds` phải do BACKEND lọc: bỏ người ở client sau khi nhận trang thì `content` ngắn đi
// trong khi `totalElements`/`totalPages` vẫn đếm cả họ — nhập xong một lớp là picker hiện trang
// trống kèm số đếm khác 0, và tìm đúng người chưa thêm cũng ra "không tìm thấy".
const EXAM_DIRECTORY_STUDENTS_QUERY = `
  query ExamDirectoryStudents($examId: ID!, $search: String, $page: Int!, $size: Int!, $excludeUserIds: [ID!]) {
    examDirectoryStudents(
      examId: $examId
      search: $search
      page: $page
      size: $size
      excludeUserIds: $excludeUserIds
    ) {
      ${EXAM_DIRECTORY_USER_FIELDS}
    }
  }
`

const EXAM_DIRECTORY_PROCTORS_QUERY = `
  query ExamDirectoryProctors($examId: ID!, $search: String, $page: Int!, $size: Int!, $excludeUserIds: [ID!]) {
    examDirectoryProctors(
      examId: $examId
      search: $search
      page: $page
      size: $size
      excludeUserIds: $excludeUserIds
    ) {
      ${EXAM_DIRECTORY_USER_FIELDS}
    }
  }
`

export const examDirectoryQueryKeys = {
  classes: (examId: string, page: number, size: number, search: string) =>
    [...examQueryKeys.all, 'directory', 'classes', examId, page, size, search] as const,
  grades: (examId: string, page: number, size: number, search: string) =>
    [...examQueryKeys.all, 'directory', 'grades', examId, page, size, search] as const,
  // `excludeUserIds` nằm trong key: thêm xong một thí sinh là tập loại trừ đổi, picker phải tải
  // lại chứ không được hiện lại trang cũ còn tên người vừa thêm.
  proctors: (examId: string, page: number, size: number, search: string, excludeUserIds: string[]) =>
    [...examQueryKeys.all, 'directory', 'proctors', examId, page, size, search, excludeUserIds] as const,
  students: (examId: string, page: number, size: number, search: string, excludeUserIds: string[]) =>
    [...examQueryKeys.all, 'directory', 'students', examId, page, size, search, excludeUserIds] as const,
}

/** Sắp xếp để key ổn định: thứ tự thí sinh trả về đổi không được coi là một tập loại trừ khác. */
function stableIds(excludeUserIds: string[]) {
  return [...excludeUserIds].sort()
}

async function fetchDirectory<T>(
  query: string,
  field: string,
  variables: ExamDirectoryVariables,
): Promise<Paged<T>> {
  const data = await graphQLRequest<Record<string, Paged<T>>>(query, variables)
  return data[field]
}

function variables(
  examId: string,
  page: number,
  size: number,
  search: string,
  excludeUserIds?: string[],
): ExamDirectoryVariables {
  return { examId, excludeUserIds, page, search: search.trim() || null, size }
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

export function useExamDirectoryStudentsQuery(
  examId: string,
  page: number,
  size: number,
  search: string,
  excludeUserIds: string[] = [],
) {
  const excluded = stableIds(excludeUserIds)
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () =>
      fetchDirectory<ExamDirectoryUser>(
        EXAM_DIRECTORY_STUDENTS_QUERY,
        'examDirectoryStudents',
        variables(examId, page, size, search, excluded),
      ),
    queryKey: examDirectoryQueryKeys.students(examId, page, size, search, excluded),
  })
}

export function useExamDirectoryProctorsQuery(
  examId: string,
  page: number,
  size: number,
  search: string,
  excludeUserIds: string[] = [],
) {
  const excluded = stableIds(excludeUserIds)
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () =>
      fetchDirectory<ExamDirectoryUser>(
        EXAM_DIRECTORY_PROCTORS_QUERY,
        'examDirectoryProctors',
        variables(examId, page, size, search, excluded),
      ),
    queryKey: examDirectoryQueryKeys.proctors(examId, page, size, search, excluded),
  })
}
