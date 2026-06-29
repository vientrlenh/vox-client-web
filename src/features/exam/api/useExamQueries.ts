import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type {
  ExamBlueprintDto,
  ExamBlueprintPage,
  ExamDto,
  ExamKind,
  ExamPage,
  ExamStatus,
} from '../types'

const EXAM_LIST_FIELDS = `
  id
  blueprintId
  code
  name
  description
  schoolId
  languageId
  kind
  status
  openAt
  closeAt
  assessmentPolicyId
  createdAt
  updatedAt
  createdBy
  updatedBy
  schoolClassId
`

const EXAM_DETAIL_FIELDS = `
  ${EXAM_LIST_FIELDS}
  members {
    id
    userId
    role
    grantedAt
    grantedBy
  }
  papers {
    id
    examId
    code
    variant
    status
    createdAt
    updatedAt
    sections {
      id
      paperId
      order
      title
      instruction
      sectionTimeLimitSeconds
      items {
        id
        blueprintSlotId
        sectionId
        paperId
        questionId
        order
        weight
        question {
          id
          code
          questionText
        }
      }
    }
  }
  securePool {
    id
    examId
    status
    releaseMode
    embargoUntil
    releasedAt
    releasedBy
  }
`

const EXAMS_QUERY = `
  query Exams($kind: ExamKind, $status: ExamStatus, $schoolId: UUID, $keyword: String, $page: Int!, $size: Int!) {
    exams(kind: $kind, status: $status, schoolId: $schoolId, keyword: $keyword, page: $page, size: $size) {
      content { ${EXAM_LIST_FIELDS} }
      page
      size
      totalElements
      totalPages
    }
  }
`

const CLASS_TESTS_QUERY = `
  query ClassTests($status: ExamStatus, $schoolClassId: UUID, $keyword: String, $page: Int!, $size: Int!) {
    classTests(status: $status, schoolClassId: $schoolClassId, keyword: $keyword, page: $page, size: $size) {
      content { ${EXAM_LIST_FIELDS} }
      page
      size
      totalElements
      totalPages
    }
  }
`

const EXAM_QUERY = `
  query Exam($id: UUID!) {
    exam(id: $id) { ${EXAM_DETAIL_FIELDS} }
  }
`

const EXAM_BLUEPRINT_LIST_FIELDS = `
  id
  schoolId
  languageId
  schoolGradeLevelId
  code
  name
  description
  isActive
  createdAt
  updatedAt
`

const EXAM_BLUEPRINT_DETAIL_FIELDS = `
  ${EXAM_BLUEPRINT_LIST_FIELDS}
  versions {
    id
    blueprintId
    version
    code
    description
    status
    totalTimeLimitSeconds
    effectiveFrom
    effectiveTo
    sections {
      id
      blueprintVersionId
      order
      title
      instruction
      sectionTimeLimitSeconds
      sectionWeight
      slots {
        id
        sectionId
        blueprintVersionId
        order
        weight
        prepTimeSecondsOverride
        responseTimeSecondsOverride
        slotType
        fixedQuestionId
        selectionSpec {
          questionType
          difficulty
          targetBandLevel
          skillCode
          topicId
        }
        fixedQuestion {
          id
          code
          questionText
        }
      }
    }
  }
`

const EXAM_BLUEPRINTS_QUERY = `
  query ExamBlueprints($schoolId: UUID, $isActive: Boolean, $languageId: UUID, $keyword: String, $page: Int!, $size: Int!) {
    examBlueprints(schoolId: $schoolId, isActive: $isActive, languageId: $languageId, keyword: $keyword, page: $page, size: $size) {
      content { ${EXAM_BLUEPRINT_LIST_FIELDS} }
      page
      size
      totalElements
      totalPages
    }
  }
`

const EXAM_BLUEPRINT_QUERY = `
  query ExamBlueprint($id: UUID!) {
    examBlueprint(id: $id) { ${EXAM_BLUEPRINT_DETAIL_FIELDS} }
  }
`

type ExamsQueryData = { exams: ExamPage }
type ClassTestsQueryData = { classTests: ExamPage }
type ExamQueryData = { exam: ExamDto | null }
type ExamBlueprintsQueryData = { examBlueprints: ExamBlueprintPage }
type ExamBlueprintQueryData = { examBlueprint: ExamBlueprintDto | null }

export const examQueryKeys = {
  all: ['exam-management'] as const,
  exam: (id: string | null) => [...examQueryKeys.all, 'exam', id] as const,
  exams: (filters: Record<string, unknown>) => [...examQueryKeys.all, 'exams', filters] as const,
  classTests: (filters: Record<string, unknown>) => [...examQueryKeys.all, 'class-tests', filters] as const,
  blueprint: (id: string | null) => [...examQueryKeys.all, 'blueprint', id] as const,
  blueprints: (filters: Record<string, unknown>) => [...examQueryKeys.all, 'blueprints', filters] as const,
}

export function useExamsQuery(filters: {
  kind?: ExamKind
  keyword?: string
  page: number
  schoolId?: string
  size: number
  status?: ExamStatus
}) {
  return useQuery({
    queryFn: async () => {
      const data = await graphQLRequest<ExamsQueryData>(EXAMS_QUERY, {
        keyword: filters.keyword || undefined,
        kind: filters.kind,
        page: filters.page - 1,
        schoolId: filters.schoolId || undefined,
        size: filters.size,
        status: filters.status,
      })
      return { ...data.exams, page: data.exams.page + 1 }
    },
    queryKey: examQueryKeys.exams(filters),
  })
}

export function useClassTestsQuery(filters: {
  keyword?: string
  page: number
  schoolClassId?: string
  size: number
  status?: ExamStatus
}) {
  return useQuery({
    queryFn: async () => {
      const data = await graphQLRequest<ClassTestsQueryData>(CLASS_TESTS_QUERY, {
        keyword: filters.keyword || undefined,
        page: filters.page - 1,
        schoolClassId: filters.schoolClassId || undefined,
        size: filters.size,
        status: filters.status,
      })
      return { ...data.classTests, page: data.classTests.page + 1 }
    },
    queryKey: examQueryKeys.classTests(filters),
  })
}

export function useExamQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: async () => {
      const data = await graphQLRequest<ExamQueryData>(EXAM_QUERY, { id })
      return data.exam
    },
    queryKey: examQueryKeys.exam(id),
  })
}

export function useExamBlueprintsQuery(filters: {
  isActive?: boolean
  keyword?: string
  languageId?: string
  page: number
  schoolId?: string
  size: number
}) {
  return useQuery({
    queryFn: async () => {
      const data = await graphQLRequest<ExamBlueprintsQueryData>(EXAM_BLUEPRINTS_QUERY, {
        isActive: filters.isActive,
        keyword: filters.keyword || undefined,
        languageId: filters.languageId || undefined,
        page: filters.page - 1,
        schoolId: filters.schoolId || undefined,
        size: filters.size,
      })
      return { ...data.examBlueprints, page: data.examBlueprints.page + 1 }
    },
    queryKey: examQueryKeys.blueprints(filters),
  })
}

export function useExamBlueprintQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: async () => {
      const data = await graphQLRequest<ExamBlueprintQueryData>(EXAM_BLUEPRINT_QUERY, { id })
      return data.examBlueprint
    },
    queryKey: examQueryKeys.blueprint(id),
  })
}
