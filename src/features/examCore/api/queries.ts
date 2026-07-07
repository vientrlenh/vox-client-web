import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type {
  ExamCandidateDto,
  ExamBlueprintDto,
  ExamDto,
  ExamPaperDto,
  ExamRoomDto,
  ExamScheduleDto,
  Paged,
} from '../types'

const EXAM_MEMBER_FIELDS = `
  id
  userId
  role
  grantedAt
  grantedBy
  user {
    id
    fullName
    email
  }
`

const EXAM_PAPER_FIELDS = `
  id
  examId
  blueprintVersionId
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
        status
      }
    }
  }
`

export const EXAM_LIST_FIELDS = `
  id
  blueprintId
  blueprintVersionId
  code
  name
  description
  schoolId
  languageId
  kind
  status
  openAt
  closeAt
  createdAt
  updatedAt
  schoolClassId
  candidateCount
  papers {
    id
    status
    sections {
      id
      items {
        id
        questionId
      }
    }
  }
`

const EXAM_DETAIL_FIELDS = `
  ${EXAM_LIST_FIELDS}
  members {
    ${EXAM_MEMBER_FIELDS}
  }
  papers {
    ${EXAM_PAPER_FIELDS}
  }
`

const BLUEPRINT_VERSION_FIELDS = `
  id
  blueprintId
  version
  code
  description
  status
  totalTimeLimitSeconds
  effectiveFrom
  effectiveTo
  sectionCount
  slotCount
  weightSum
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
        status
      }
    }
  }
`

const BLUEPRINT_FIELDS = `
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
  versionCount
  sectionCount
  currentVersion {
    ${BLUEPRINT_VERSION_FIELDS}
  }
  versions {
    ${BLUEPRINT_VERSION_FIELDS}
  }
`

const EXAM_QUERY = `
  query Exam($id: ID!) {
    exam(id: $id) {
      ${EXAM_DETAIL_FIELDS}
    }
  }
`

const EXAM_PAPER_QUERY = `
  query ExamPaper($id: ID!) {
    examPaper(id: $id) {
      ${EXAM_PAPER_FIELDS}
    }
  }
`

const EXAM_STATUS_COUNTS_QUERY = `
  query ExamStatusCounts($kind: ExamKind) {
    examStatusCounts(kind: $kind) {
      total
      draft
      scheduled
      inProgress
      closed
      resultsPublished
      cancelled
    }
  }
`

const EXAM_BLUEPRINTS_QUERY = `
  query ExamBlueprints($isActive: Boolean, $keyword: String, $page: Int!, $size: Int!) {
    examBlueprints(isActive: $isActive, keyword: $keyword, page: $page, size: $size) {
      content {
        ${BLUEPRINT_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

const EXAM_BLUEPRINT_QUERY = `
  query ExamBlueprint($id: ID!) {
    examBlueprint(id: $id) {
      ${BLUEPRINT_FIELDS}
    }
  }
`

export type ExamStatusCounts = {
  cancelled: number
  closed: number
  draft: number
  inProgress: number
  resultsPublished: number
  scheduled: number
  total: number
}

export const examQueryKeys = {
  all: ['exam-management'] as const,
  blueprint: (id: string | null) => [...examQueryKeys.all, 'blueprint', id] as const,
  blueprints: (filters: Record<string, unknown>) => [...examQueryKeys.all, 'blueprints', filters] as const,
  candidates: (examId: string | null) => [...examQueryKeys.all, 'candidates', examId] as const,
  classTests: (filters: Record<string, unknown>) => [...examQueryKeys.all, 'class-tests', filters] as const,
  classTestStats: () => [...examQueryKeys.all, 'class-test-stats'] as const,
  exam: (id: string | null) => [...examQueryKeys.all, 'exam', id] as const,
  examPaper: (paperId: string | null) => [...examQueryKeys.all, 'exam-paper', paperId] as const,
  examStats: () => [...examQueryKeys.all, 'exam-stats'] as const,
  exams: (filters: Record<string, unknown>) => [...examQueryKeys.all, 'exams', filters] as const,
  rooms: (scheduleId: string | null) => [...examQueryKeys.all, 'rooms', scheduleId] as const,
  schedules: (examId: string | null) => [...examQueryKeys.all, 'schedules', examId] as const,
}

export async function fetchExamStatusCounts(kind: 'CENTRALIZED' | 'CLASS_TEST') {
  const data = await graphQLRequest<{ examStatusCounts: ExamStatusCounts }>(EXAM_STATUS_COUNTS_QUERY, { kind })
  return data.examStatusCounts
}

async function fetchExam(id: string) {
  const data = await graphQLRequest<{ exam: ExamDto | null }>(EXAM_QUERY, { id })
  return data.exam
}

export async function fetchExamPaper(id: string) {
  const data = await graphQLRequest<{ examPaper: ExamPaperDto | null }>(EXAM_PAPER_QUERY, { id })
  return data.examPaper
}

async function fetchBlueprints(filters: { isActive?: boolean; keyword?: string; page: number; size: number }) {
  const data = await graphQLRequest<{ examBlueprints: Paged<ExamBlueprintDto> }>(EXAM_BLUEPRINTS_QUERY, {
    isActive: filters.isActive ?? null,
    keyword: filters.keyword?.trim() || null,
    page: filters.page - 1,
    size: filters.size,
  })
  return data.examBlueprints
}

async function fetchBlueprint(id: string) {
  const data = await graphQLRequest<{ examBlueprint: ExamBlueprintDto | null }>(EXAM_BLUEPRINT_QUERY, { id })
  return data.examBlueprint
}

export function useExamQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchExam(id as string),
    queryKey: examQueryKeys.exam(id),
  })
}

const EXAM_MY_ROLE_QUERY = `
  query ExamMyRole($examId: ID!) {
    examMyRole(examId: $examId)
  }
`

async function fetchExamMyRole(examId: string) {
  const data = await graphQLRequest<{ examMyRole: string | null }>(EXAM_MY_ROLE_QUERY, { examId })
  return data.examMyRole
}

export function useExamMyRoleQuery(examId: string | null) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () => fetchExamMyRole(examId as string),
    queryKey: [...examQueryKeys.all, 'my-role', examId],
  })
}

export function useExamPaperQuery(paperId: string | null) {
  return useQuery({
    enabled: Boolean(paperId),
    queryFn: () => fetchExamPaper(paperId as string),
    queryKey: examQueryKeys.examPaper(paperId),
  })
}

export function useExamBlueprintsQuery(filters: { isActive?: boolean; keyword?: string; page: number; size: number }) {
  return useQuery({
    queryFn: () => fetchBlueprints(filters),
    queryKey: examQueryKeys.blueprints(filters),
    select: (data) => ({ ...data, page: data.page + 1 }),
  })
}

export function useExamBlueprintQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchBlueprint(id as string),
    queryKey: examQueryKeys.blueprint(id),
  })
}

export function useExamCandidatesQuery(examId: string | null) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: async () => [] as ExamCandidateDto[],
    queryKey: examQueryKeys.candidates(examId),
  })
}

export function useExamSchedulesQuery(examId: string | null) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: async () => [] as ExamScheduleDto[],
    queryKey: examQueryKeys.schedules(examId),
  })
}

export function useExamRoomsQuery(examId: string | null) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: async () => [] as ExamRoomDto[],
    queryKey: [...examQueryKeys.all, 'exam-rooms', examId],
  })
}

export function useScheduleRoomsQuery(scheduleId: string | null) {
  return useQuery({
    enabled: Boolean(scheduleId),
    queryFn: async () => [] as ExamRoomDto[],
    queryKey: examQueryKeys.rooms(scheduleId),
  })
}
