import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type {
  ExamCandidateDto,
  ExamBlueprintDto,
  ExamBlueprintVersionDto,
  ExamDto,
  ExamKind,
  ExamPaperDto,
  ExamPickerOption,
  ExamScheduleDto,
  ExamStatus,
  Paged,
  ProctorCandidateSummaryDto,
  ProctorScheduleSummaryDto,
  SchoolRoomLite,
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
  timeDurationSeconds
  createdAt
  updatedAt
  sections {
    id
    paperId
    order
    title
    instruction
    weight
    sectionTimeLimitSeconds
    items {
      id
      blueprintSlotId
      sectionId
      paperId
      questionId
      order
      weight
      slotType
      selectionSpec {
        questionType
        difficulty
        targetBandLevel
        skillCode
        topicId
      }
      question {
        id
        code
        questionText
        status
        preparationTimeSeconds
        minResponseSeconds
        maxResponseSeconds
      }
    }
  }
`

export const EXAM_LIST_FIELDS = `
  id
  blueprintId
  blueprintVersionId
  assessmentPolicyId
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
    timeDurationSeconds
    sections {
      id
      items {
        id
        questionId
      }
    }
  }
`

const EXAM_SUMMARY_FIELDS = `
  id
  blueprintId
  blueprintVersionId
  assessmentPolicyId
  code
  name
  description
  schoolId
  languageId
  status
  openAt
  closeAt
  createdAt
  updatedAt
  candidateCount
  deliveryMode
  maxAttempt
  resultDecisionMethod
  securePool {
    id
    status
  }
  members {
    ${EXAM_MEMBER_FIELDS}
  }
`

const EXAM_PAPERS_SUMMARY_FIELDS = `
  id
  examId
  blueprintVersionId
  code
  variant
  status
  timeDurationSeconds
  sections {
    id
    items {
      id
      questionId
    }
  }
`

const EXAM_DETAIL_FIELDS = `
  ${EXAM_LIST_FIELDS}
  deliveryMode
  papersLocked
  maxAttempt
  examTimeDurationSecond
  resultDecisionMethod
  securePool {
    id
    status
  }
  members {
    ${EXAM_MEMBER_FIELDS}
  }
  papers {
    ${EXAM_PAPER_FIELDS}
  }
`

const SCHOOL_ROOM_FIELDS = `
  id
  code
  name
  description
`

const EXAM_SCHEDULE_PROCTOR_FIELDS = `
  id
  scheduleId
  teacher {
    id
    fullName
    email
  }
`

const EXAM_SCHEDULE_FIELDS = `
  id
  examId
  schoolRoomId
  room {
    ${SCHOOL_ROOM_FIELDS}
  }
  startDate
  endDate
  status
  movedToScheduleId
  candidateCount
  requiredProctorCount
  proctors {
    ${EXAM_SCHEDULE_PROCTOR_FIELDS}
  }
`

const EXAM_CANDIDATE_FIELDS = `
  id
  examId
  studentId
  latestSessionId
  attempts {
    sessionId
    startedAt
    submittedAt
    status
    flagged
    flagReason
    totalScore
    rubricResultBandCode
    rubricResultBandName
    resultStatus
  }
  officialAttempt {
    sessionId
    startedAt
    submittedAt
    status
    flagged
    flagReason
    totalScore
    rubricResultBandCode
    rubricResultBandName
    resultStatus
  }
  officialScore
  scheduleId
  assignedPaperId
  status
  assignedAt
  blockedAt
  student {
    id
    fullName
    email
  }
`

const PROCTOR_SCHEDULE_FIELDS = `
  scheduleId
  examId
  examName
  schoolRoomId
  roomName
  startDate
  endDate
  status
`

const PROCTOR_CANDIDATE_FIELDS = `
  candidateId
  studentId
  studentName
  studentEmail
  status
  blockedAt
  sessionId
  sessionStatus
  sessionFlagged
`

const EXAM_SCHEDULES_QUERY = `
  query ExamSchedules($examId: ID) {
    examSchedules(examId: $examId) {
      ${EXAM_SCHEDULE_FIELDS}
    }
  }
`

const EXAM_CANDIDATES_QUERY = `
  query ExamCandidates($examId: ID!, $scheduleId: ID, $status: ExamCandidateStatus) {
    examCandidates(examId: $examId, scheduleId: $scheduleId, status: $status) {
      ${EXAM_CANDIDATE_FIELDS}
    }
  }
`

const MY_PROCTOR_SCHEDULES_QUERY = `
  query MyProctorSchedules {
    myProctorSchedules {
      ${PROCTOR_SCHEDULE_FIELDS}
    }
  }
`

const MY_PROCTOR_SCHEDULE_CANDIDATES_QUERY = `
  query MyProctorScheduleCandidates($scheduleId: ID!) {
    myProctorScheduleCandidates(scheduleId: $scheduleId) {
      ${PROCTOR_CANDIDATE_FIELDS}
    }
  }
`

const SCHOOL_ROOMS_QUERY = `
  query SchoolRooms($schoolId: ID!, $page: Int, $size: Int) {
    schoolRooms(schoolId: $schoolId, page: $page, size: $size) {
      content {
        ${SCHOOL_ROOM_FIELDS}
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

const BLUEPRINT_VERSION_SUMMARY_FIELDS = `
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
`

const BLUEPRINT_VERSION_FIELDS = `
  ${BLUEPRINT_VERSION_SUMMARY_FIELDS}
  sections {
    id
    blueprintVersionId
    order
    title
    sectionWeight
    slots {
      id
      sectionId
      blueprintVersionId
      order
      weight
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
        preparationTimeSeconds
        maxResponseSeconds
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
  versions {
    ${BLUEPRINT_VERSION_SUMMARY_FIELDS}
  }
`

const BLUEPRINT_DETAIL_FIELDS = `
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

/**
 * Trang exam detail dùng 1 request duy nhất thay vì tách riêng exam/papers/blueprint/myRole —
 * mỗi field vẫn resolve gọn (DataLoader + query COUNT), nhưng gộp lại để giảm số request
 * /graphql đồng thời (mở nhiều tab cùng lúc từng làm cạn pool connection DB).
 */
const EXAM_DETAIL_BUNDLE_QUERY = `
  query ExamDetailBundle($id: ID!) {
    exam(id: $id) {
      ${EXAM_SUMMARY_FIELDS}
      papers {
        ${EXAM_PAPERS_SUMMARY_FIELDS}
      }
      blueprint {
        ${BLUEPRINT_FIELDS}
      }
    }
    examMyRole(examId: $id)
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

const EXAM_BLUEPRINT_SUMMARY_QUERY = `
  query ExamBlueprintSummary($id: ID!) {
    examBlueprint(id: $id) {
      ${BLUEPRINT_FIELDS}
    }
  }
`

const EXAM_BLUEPRINT_QUERY = `
  query ExamBlueprint($id: ID!) {
    examBlueprint(id: $id) {
      ${BLUEPRINT_DETAIL_FIELDS}
    }
  }
`

const EXAM_BLUEPRINT_VERSION_QUERY = `
  query ExamBlueprintVersion($id: ID!) {
    examBlueprintVersion(id: $id) {
      ${BLUEPRINT_VERSION_FIELDS}
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

/**
 * Dữ liệu tham chiếu dùng trong luồng soạn kỳ thi (rubric, chính sách đánh giá).
 *
 * Tách khỏi `examQueryKeys` vì đây KHÔNG phải dữ liệu kỳ thi: mọi mutation kỳ thi đều invalidate
 * `examQueryKeys.all`, kéo theo refetch cả danh sách rubric và toàn bộ query phiên bản rubric — trong
 * khi sửa kỳ thi không làm rubric đổi. Chiều ngược lại cũng không mất gì: CRUD rubric nằm ở
 * `features/rubric_system` / `features/rubrics_school` với namespace key riêng
 * (`searchRubricKeys`, `rubricVersionQueryKeys`), chưa bao giờ đụng tới `examQueryKeys`.
 */
export const examReferenceQueryKeys = {
  all: ['exam-reference-data'] as const,
}

export const examQueryKeys = {
  all: ['exam-management'] as const,
  blueprint: (id: string | null) => [...examQueryKeys.all, 'blueprint', id] as const,
  blueprintSummary: (id: string | null) => [...examQueryKeys.all, 'blueprint-summary', id] as const,
  blueprintVersion: (id: string | null) => [...examQueryKeys.all, 'blueprint-version', id] as const,
  blueprints: (filters: Record<string, unknown>) => [...examQueryKeys.all, 'blueprints', filters] as const,
  candidates: (examId: string | null) => [...examQueryKeys.all, 'candidates', examId] as const,
  classTests: (filters: Record<string, unknown>) => [...examQueryKeys.all, 'class-tests', filters] as const,
  classTestStats: () => [...examQueryKeys.all, 'class-test-stats'] as const,
  exam: (id: string | null) => [...examQueryKeys.all, 'exam', id] as const,
  examDetailBundle: (id: string | null) => [...examQueryKeys.all, 'exam-detail-bundle', id] as const,
  examPaper: (paperId: string | null) => [...examQueryKeys.all, 'exam-paper', paperId] as const,
  examPicker: (filters: Record<string, unknown>) => [...examQueryKeys.all, 'exam-picker', filters] as const,
  examStats: () => [...examQueryKeys.all, 'exam-stats'] as const,
  exams: (filters: Record<string, unknown>) => [...examQueryKeys.all, 'exams', filters] as const,
  proctorCandidates: (scheduleId: string | null) => [...examQueryKeys.all, 'proctor-candidates', scheduleId] as const,
  proctorSchedules: () => [...examQueryKeys.all, 'proctor-schedules'] as const,
  schedules: (examId: string | null) => [...examQueryKeys.all, 'schedules', examId] as const,
  schoolRooms: (page: number, size: number, search: string) =>
    [...examQueryKeys.all, 'school-rooms', page, size, search] as const,
}

function normalizeDeliveryMode(exam: ExamDto | null): ExamDto | null {
  if (!exam) {
    return exam
  }
  return {
    ...exam,
    deliveryMode: (exam.deliveryMode as unknown as string) === 'STUDENT_DEVICE' ? 'DEVICE' : exam.deliveryMode,
  }
}

export async function fetchExamStatusCounts(kind: 'CENTRALIZED' | 'CLASS_TEST') {
  const data = await graphQLRequest<{ examStatusCounts: ExamStatusCounts }>(EXAM_STATUS_COUNTS_QUERY, { kind })
  return data.examStatusCounts
}

async function fetchExam(id: string) {
  const data = await graphQLRequest<{ exam: ExamDto | null }>(EXAM_QUERY, { id })
  return normalizeDeliveryMode(data.exam)
}

async function fetchExamDetailBundle(id: string) {
  const data = await graphQLRequest<{ exam: ExamDto | null; examMyRole: string | null }>(EXAM_DETAIL_BUNDLE_QUERY, { id })
  return { exam: normalizeDeliveryMode(data.exam), myRole: data.examMyRole }
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

async function fetchBlueprintSummary(id: string) {
  const data = await graphQLRequest<{ examBlueprint: ExamBlueprintDto | null }>(EXAM_BLUEPRINT_SUMMARY_QUERY, { id })
  return data.examBlueprint
}

async function fetchBlueprintVersion(id: string) {
  const data = await graphQLRequest<{ examBlueprintVersion: ExamBlueprintVersionDto | null }>(EXAM_BLUEPRINT_VERSION_QUERY, { id })
  return data.examBlueprintVersion
}

export function useExamQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchExam(id as string),
    queryKey: examQueryKeys.exam(id),
  })
}

export function useExamDetailBundleQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchExamDetailBundle(id as string),
    queryKey: examQueryKeys.examDetailBundle(id),
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

export function useExamBlueprintSummaryQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchBlueprintSummary(id as string),
    queryKey: examQueryKeys.blueprintSummary(id),
  })
}

export function useExamBlueprintVersionQuery(id: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchBlueprintVersion(id as string),
    queryKey: examQueryKeys.blueprintVersion(id),
  })
}

async function fetchExamSchedules(examId: string) {
  const data = await graphQLRequest<{ examSchedules: ExamScheduleDto[] }>(EXAM_SCHEDULES_QUERY, { examId })
  return data.examSchedules
}

export function useExamSchedulesQuery(examId: string | null) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () => fetchExamSchedules(examId as string),
    queryKey: examQueryKeys.schedules(examId),
  })
}

async function fetchExamCandidates(examId: string) {
  const data = await graphQLRequest<{ examCandidates: ExamCandidateDto[] }>(EXAM_CANDIDATES_QUERY, {
    examId,
    scheduleId: null,
    status: null,
  })
  return data.examCandidates
}

export function useExamCandidatesQuery(examId: string | null) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: () => fetchExamCandidates(examId as string),
    queryKey: examQueryKeys.candidates(examId),
  })
}

async function fetchMyProctorSchedules() {
  const data = await graphQLRequest<{ myProctorSchedules: ProctorScheduleSummaryDto[] }>(MY_PROCTOR_SCHEDULES_QUERY)
  return data.myProctorSchedules
}

export function useMyProctorSchedulesQuery() {
  return useQuery({
    queryFn: fetchMyProctorSchedules,
    queryKey: examQueryKeys.proctorSchedules(),
  })
}

async function fetchMyProctorScheduleCandidates(scheduleId: string) {
  const data = await graphQLRequest<{ myProctorScheduleCandidates: ProctorCandidateSummaryDto[] }>(
    MY_PROCTOR_SCHEDULE_CANDIDATES_QUERY,
    { scheduleId },
  )
  return data.myProctorScheduleCandidates
}

export function useMyProctorScheduleCandidatesQuery(scheduleId: string | null) {
  return useQuery({
    enabled: Boolean(scheduleId),
    queryFn: () => fetchMyProctorScheduleCandidates(scheduleId as string),
    queryKey: examQueryKeys.proctorCandidates(scheduleId),
  })
}

async function fetchSchoolRooms(page: number, size: number, search: string) {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<{ schoolRooms: Paged<SchoolRoomLite> }>(SCHOOL_ROOMS_QUERY, {
    page,
    schoolId,
    size,
  })
  const keyword = search.trim().toLowerCase()
  if (!keyword) {
    return data.schoolRooms
  }
  return {
    ...data.schoolRooms,
    content: data.schoolRooms.content.filter(
      (room) => room.code.toLowerCase().includes(keyword) || room.name.toLowerCase().includes(keyword),
    ),
  }
}

export function useSchoolRoomsQuery(page: number, size: number, search: string) {
  return useQuery({
    queryFn: () => fetchSchoolRooms(page, size, search),
    queryKey: examQueryKeys.schoolRooms(page, size, search),
  })
}

// Chỉ những trường một danh sách chọn cần. Đừng thêm `papers`/`members`/`candidateCount`:
// chúng chạy qua DataLoader nên mỗi field là thêm một loạt query cho mỗi dòng.
const EXAM_PICKER_QUERY = `
  query ExamPickerOptions($keyword: String, $status: ExamStatus, $kind: ExamKind, $page: Int!, $size: Int!) {
    exams(keyword: $keyword, status: $status, kind: $kind, page: $page, size: $size) {
      content {
        id
        code
        name
        status
        openAt
        closeAt
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

export type FetchExamPickerOptionsInput = {
  keyword?: string
  /**
   * Loại bài. Bỏ trống là BE trả cả kỳ thi tập trung lẫn bài kiểm tra trên lớp — màn
   * phân công chấm bài của nhà trường vì thế từng liệt kê cả bài trên lớp mà chọn vào
   * là gán không được.
   */
  kind?: ExamKind
  page: number
  size: number
  status?: ExamStatus | ''
}

/** BE lọc `keyword` theo cả `code` lẫn `name` nên không cần lọc thêm ở client. */
export async function fetchExamPickerOptions(input: FetchExamPickerOptionsInput) {
  const data = await graphQLRequest<{ exams: Paged<ExamPickerOption> }>(EXAM_PICKER_QUERY, {
    keyword: input.keyword?.trim() || null,
    kind: input.kind ?? null,
    page: input.page - 1,
    size: input.size,
    status: input.status || null,
  })
  return data.exams
}

// Phân trang 0-based ở server, UI 1-based: -1 khi query, +1 ở `select`.
export function useExamPickerOptionsQuery(input: FetchExamPickerOptionsInput) {
  return useQuery({
    // Giữ trang cũ trong lúc nạp trang/từ khoá mới, nếu không danh sách chớp trắng mỗi lần gõ.
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchExamPickerOptions(input),
    queryKey: examQueryKeys.examPicker(input),
    select: (data) => ({ ...data, page: data.page + 1 }),
  })
}
