import {
  MOCK_LANGUAGE_ID,
  MOCK_SCHOOL_ID,
  mockBlueprints,
  mockCandidates,
  mockClassTests,
  mockExams,
  mockRooms,
  mockSchedules,
} from './examData'
import type {
  CreateClassTestRequest,
  CreateExamBlueprintRequest,
  CreateExamMemberRequest,
  CreateExamRequest,
  ExamBlueprintDto,
  ExamBlueprintSectionDto,
  ExamBlueprintSlotDto,
  ExamBlueprintVersionDto,
  ExamCandidateDto,
  ExamDeliveryMode,
  ExamDto,
  ExamMemberDto,
  ExamMemberRole,
  ExamPaperDto,
  ExamPaperItemDto,
  ExamPaperSectionDto,
  ExamProctorDto,
  ExamRoomDto,
  ExamScheduleDto,
  UpdateExamBlueprintVersionStatusRequest,
  UpdateExamPaperItemRequest,
  UpdateExamPaperStatusRequest,
  UpdateExamRequest,
  UpdateExamStatusRequest,
} from '../types'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function genId(prefix: string) {
  const uuid =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `${prefix}-${uuid}`
}

const state = {
  blueprints: clone(mockBlueprints),
  candidates: clone(mockCandidates),
  classTests: clone(mockClassTests),
  exams: clone(mockExams),
  rooms: clone(mockRooms),
  schedules: clone(mockSchedules),
}

export async function delay(ms = 220) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export function paginate<T>(items: T[], page: number, size: number) {
  const totalElements = items.length
  const totalPages = Math.max(1, Math.ceil(totalElements / size))
  const start = page * size
  return {
    content: items.slice(start, start + size),
    page,
    size,
    totalElements,
    totalPages,
  }
}

function matchesKeywordStatus(exam: ExamDto, filters: { keyword?: string; status?: string }) {
  const keyword = filters.keyword?.trim().toLowerCase()
  const matchesKeyword =
    !keyword || exam.name.toLowerCase().includes(keyword) || exam.code.toLowerCase().includes(keyword)
  const matchesStatus = !filters.status || exam.status === filters.status
  return matchesKeyword && matchesStatus
}

// ---------------------------------------------------------------------------
// Exams (CENTRALIZED)
// ---------------------------------------------------------------------------

export function listExams(filters: { keyword?: string; page: number; size: number; status?: string }) {
  const items = state.exams.filter((exam) => matchesKeywordStatus(exam, filters))
  return paginate(items, filters.page, filters.size)
}

export function countExams(status?: string) {
  return status ? state.exams.filter((exam) => exam.status === status).length : state.exams.length
}

export function getExam(id: string): ExamDto | null {
  return state.exams.find((exam) => exam.id === id) ?? state.classTests.find((exam) => exam.id === id) ?? null
}

function findExamMutable(id: string): ExamDto | undefined {
  return state.exams.find((exam) => exam.id === id) ?? state.classTests.find((exam) => exam.id === id)
}

export function createExam(payload: CreateExamRequest) {
  const now = new Date().toISOString()
  const exam: ExamDto = {
    blueprintId: null,
    blueprintVersionId: null,
    closeAt: null,
    code: payload.code,
    createdAt: now,
    description: payload.description ?? null,
    id: genId('exam'),
    kind: 'CENTRALIZED',
    languageId: payload.languageId || MOCK_LANGUAGE_ID,
    members: [],
    name: payload.name,
    openAt: null,
    papers: [],
    schoolId: MOCK_SCHOOL_ID,
    status: 'DRAFT',
    updatedAt: now,
  }
  state.exams.unshift(exam)
  return exam
}

export function updateExam(examId: string, payload: UpdateExamRequest) {
  const exam = findExamMutable(examId)
  if (!exam) {
    throw new Error('Không tìm thấy kỳ thi.')
  }
  if (payload.name !== undefined) exam.name = payload.name
  if (payload.description !== undefined) exam.description = payload.description
  if (payload.openAt !== undefined) exam.openAt = payload.openAt
  if (payload.closeAt !== undefined) exam.closeAt = payload.closeAt
  exam.updatedAt = new Date().toISOString()
  return exam
}

export function updateExamStatus(examId: string, payload: UpdateExamStatusRequest) {
  const exam = findExamMutable(examId)
  if (!exam) {
    throw new Error('Không tìm thấy kỳ thi.')
  }
  const nextStatus: Record<UpdateExamStatusRequest['action'], ExamDto['status']> = {
    CANCEL: 'CANCELLED',
    CLOSE: 'CLOSED',
    PUBLISH_RESULTS: 'RESULTS_PUBLISHED',
    SCHEDULE: 'SCHEDULED',
    START: 'IN_PROGRESS',
  }
  exam.status = nextStatus[payload.action]
  exam.updatedAt = new Date().toISOString()
  return exam
}

export function deleteExam(examId: string) {
  state.exams = state.exams.filter((exam) => exam.id !== examId)
  state.classTests = state.classTests.filter((exam) => exam.id !== examId)
}

export function attachExamBlueprint(examId: string, blueprintId: string | null, blueprintVersionId: string | null) {
  const exam = findExamMutable(examId)
  if (!exam) {
    throw new Error('Không tìm thấy kỳ thi.')
  }
  exam.blueprintId = blueprintId
  exam.blueprintVersionId = blueprintVersionId
  exam.updatedAt = new Date().toISOString()
  return exam
}

export function setExamDeliveryMode(examId: string, deliveryMode: ExamDeliveryMode) {
  const exam = findExamMutable(examId)
  if (!exam) {
    throw new Error('Không tìm thấy kỳ thi.')
  }
  exam.deliveryMode = deliveryMode
  return exam
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export function addExamMember(examId: string, payload: CreateExamMemberRequest & { email?: string; fullName?: string }) {
  const exam = findExamMutable(examId)
  if (!exam) {
    throw new Error('Không tìm thấy kỳ thi.')
  }
  const member: ExamMemberDto = {
    grantedAt: new Date().toISOString(),
    id: genId('member'),
    role: payload.role,
    userId: payload.userId,
    user: { email: payload.email ?? null, fullName: payload.fullName ?? payload.userId, id: payload.userId },
  }
  exam.members = [...exam.members, member]
  return member
}

export function updateExamMemberRole(examId: string, memberId: string, role: ExamMemberRole) {
  const exam = findExamMutable(examId)
  const member = exam?.members.find((item) => item.id === memberId)
  if (!exam || !member) {
    throw new Error('Không tìm thấy thành viên.')
  }
  member.role = role
  return member
}

export function removeExamMember(examId: string, memberId: string) {
  const exam = findExamMutable(examId)
  if (!exam) {
    throw new Error('Không tìm thấy kỳ thi.')
  }
  exam.members = exam.members.filter((member) => member.id !== memberId)
}

// ---------------------------------------------------------------------------
// Papers
// ---------------------------------------------------------------------------

function buildBlankPaper(examId: string, variant: number, blueprintVersionId: string | null): ExamPaperDto {
  const id = genId('paper')
  const sections: ExamPaperSectionDto[] =
    blueprintVersionId != null
      ? (findBlueprintVersion(blueprintVersionId)?.sections ?? []).map((section, sectionIndex) => ({
          id: genId('sec'),
          instruction: section.instruction ?? null,
          order: sectionIndex + 1,
          paperId: id,
          sectionTimeLimitSeconds: section.sectionTimeLimitSeconds ?? null,
          title: section.title,
          items: section.slots.map((slot, slotIndex): ExamPaperItemDto => ({
            blueprintSlotId: slot.id,
            id: genId('item'),
            order: slotIndex + 1,
            question: slot.fixedQuestion ?? null,
            questionId: slot.fixedQuestionId ?? null,
            sectionId: '',
            weight: slot.weight ?? null,
          })),
        }))
      : []
  sections.forEach((section) => {
    section.items.forEach((item) => {
      item.sectionId = section.id
    })
  })
  return {
    blueprintVersionId,
    code: `SP-${String.fromCharCode(64 + variant)}`,
    createdAt: new Date().toISOString(),
    examId,
    id,
    sections,
    status: 'DRAFT',
    updatedAt: new Date().toISOString(),
    variant,
  }
}

export function createExamPaper(examId: string) {
  const exam = findExamMutable(examId)
  if (!exam) {
    throw new Error('Không tìm thấy kỳ thi.')
  }
  const nextVariant = exam.papers.length + 1
  const paper = buildBlankPaper(examId, nextVariant, exam.blueprintVersionId ?? null)
  exam.papers = [...exam.papers, paper]
  return paper
}

function findExamByPaperId(paperId: string) {
  return (
    state.exams.find((exam) => exam.papers.some((paper) => paper.id === paperId)) ??
    state.classTests.find((exam) => exam.papers.some((paper) => paper.id === paperId))
  )
}

export function getExamPaper(paperId: string) {
  const exam = findExamByPaperId(paperId)
  return exam?.papers.find((paper) => paper.id === paperId) ?? null
}

export function updateExamPaperItem(paperId: string, itemId: string, payload: UpdateExamPaperItemRequest) {
  const exam = findExamByPaperId(paperId)
  const paperItem = exam?.papers
    .find((paper) => paper.id === paperId)
    ?.sections.flatMap((section) => section.items)
    .find((item) => item.id === itemId)
  if (!paperItem) {
    throw new Error('Không tìm thấy câu hỏi trong mã đề.')
  }
  paperItem.questionId = payload.questionId
  return paperItem
}

export function updateExamPaperStatus(paperId: string, payload: UpdateExamPaperStatusRequest) {
  const exam = findExamByPaperId(paperId)
  const targetPaper = exam?.papers.find((paper) => paper.id === paperId)
  if (!targetPaper) {
    throw new Error('Không tìm thấy mã đề.')
  }
  const nextStatus: Record<UpdateExamPaperStatusRequest['action'], ExamPaperDto['status']> = {
    APPROVE: 'APPROVED',
    LOCK: 'LOCKED',
    REQUEST_REVISION: 'DRAFT',
    SUBMIT: 'IN_REVIEW',
  }
  targetPaper.status = nextStatus[payload.action]
  targetPaper.updatedAt = new Date().toISOString()
  return targetPaper
}

export function deleteExamPaper(paperId: string) {
  const exam = findExamByPaperId(paperId)
  if (!exam) {
    return
  }
  exam.papers = exam.papers.filter((paper) => paper.id !== paperId)
}

// ---------------------------------------------------------------------------
// Class tests (CLASS_TEST)
// ---------------------------------------------------------------------------

export function listClassTests(filters: {
  keyword?: string
  page: number
  schoolClassId?: string
  size: number
  status?: string
}) {
  const items = state.classTests.filter(
    (exam) => matchesKeywordStatus(exam, filters) && (!filters.schoolClassId || exam.schoolClassId === filters.schoolClassId),
  )
  return paginate(items, filters.page, filters.size)
}

export function countClassTests(status?: string) {
  return status ? state.classTests.filter((exam) => exam.status === status).length : state.classTests.length
}

export function createClassTest(payload: CreateClassTestRequest, className: string) {
  const now = new Date().toISOString()
  const blueprintVersionId = payload.existingBlueprintVersionId ?? null
  const exam: ExamDto = {
    blueprintId: payload.existingBlueprintId ?? null,
    blueprintVersionId,
    closeAt: payload.closeAt ?? null,
    code: `CW-${new Date().getFullYear()}-${genId('').slice(-5).toUpperCase()}`,
    createdAt: now,
    description: payload.description ?? null,
    id: genId('classtest'),
    kind: 'CLASS_TEST',
    languageId: MOCK_LANGUAGE_ID,
    members: [],
    name: payload.name,
    openAt: payload.openAt ?? null,
    papers: [buildBlankPaper(genId('classtest'), 1, blueprintVersionId)],
    schoolClassId: payload.schoolClassId,
    schoolClassName: className,
    schoolId: MOCK_SCHOOL_ID,
    status: 'DRAFT',
    teacherName: null,
    updatedAt: now,
  }
  if (payload.questionIds?.length) {
    exam.papers[0].sections = [
      {
        id: genId('sec'),
        instruction: null,
        order: 1,
        paperId: exam.papers[0].id,
        sectionTimeLimitSeconds: null,
        title: 'Câu hỏi đã chọn',
        items: payload.questionIds.map((questionId, index) => ({
          id: genId('item'),
          order: index + 1,
          question: null,
          questionId,
          sectionId: '',
          weight: null,
        })),
      },
    ]
    exam.papers[0].sections[0].items.forEach((item) => {
      item.sectionId = exam.papers[0].sections[0].id
    })
  }
  exam.papers.forEach((p) => {
    p.examId = exam.id
  })
  state.classTests.unshift(exam)
  return exam
}

export function updateClassTestQuestions(examId: string, questionIds: string[]) {
  const exam = state.classTests.find((item) => item.id === examId)
  if (!exam) {
    throw new Error('Không tìm thấy bài trên lớp.')
  }
  const paper = exam.papers[0]
  if (!paper) {
    return
  }
  const sectionId = paper.sections[0]?.id ?? genId('sec')
  paper.sections = [
    {
      id: sectionId,
      instruction: null,
      order: 1,
      paperId: paper.id,
      sectionTimeLimitSeconds: null,
      title: 'Câu hỏi đã chọn',
      items: questionIds.map((questionId, index) => ({
        id: genId('item'),
        order: index + 1,
        question: null,
        questionId,
        sectionId,
        weight: null,
      })),
    },
  ]
  exam.updatedAt = new Date().toISOString()
  return exam
}

// ---------------------------------------------------------------------------
// Blueprints
// ---------------------------------------------------------------------------

export function listBlueprints(filters: { isActive?: boolean; keyword?: string; page: number; size: number }) {
  const keyword = filters.keyword?.trim().toLowerCase()
  const items = state.blueprints.filter((blueprint) => {
    const matchesKeyword =
      !keyword || blueprint.name.toLowerCase().includes(keyword) || blueprint.code.toLowerCase().includes(keyword)
    const matchesActive = filters.isActive === undefined || blueprint.isActive === filters.isActive
    return matchesKeyword && matchesActive
  })
  return paginate(items, filters.page, filters.size)
}

export function getBlueprint(id: string): ExamBlueprintDto | null {
  return state.blueprints.find((blueprint) => blueprint.id === id) ?? null
}

function findBlueprintVersion(versionId: string): ExamBlueprintVersionDto | undefined {
  for (const blueprint of state.blueprints) {
    const version = blueprint.versions.find((item) => item.id === versionId)
    if (version) {
      return version
    }
  }
  return undefined
}

export function createBlueprint(payload: CreateExamBlueprintRequest) {
  const now = new Date().toISOString()
  const blueprint: ExamBlueprintDto = {
    code: payload.code,
    createdAt: now,
    description: payload.description ?? null,
    id: genId('bp'),
    isActive: true,
    languageId: payload.languageId || MOCK_LANGUAGE_ID,
    name: payload.name,
    schoolGradeLevelId: payload.schoolGradeLevelId ?? null,
    schoolId: MOCK_SCHOOL_ID,
    updatedAt: now,
    versions: [],
  }
  state.blueprints.unshift(blueprint)
  return blueprint
}

export function updateBlueprint(blueprintId: string, payload: { description?: string | null; name?: string }) {
  const blueprint = state.blueprints.find((item) => item.id === blueprintId)
  if (!blueprint) {
    throw new Error('Không tìm thấy blueprint.')
  }
  if (payload.name !== undefined) blueprint.name = payload.name
  if (payload.description !== undefined) blueprint.description = payload.description
  blueprint.updatedAt = new Date().toISOString()
  return blueprint
}

export function deleteBlueprint(blueprintId: string) {
  state.blueprints = state.blueprints.filter((blueprint) => blueprint.id !== blueprintId)
}

export function createBlueprintVersion(
  blueprintId: string,
  payload: { effectiveFrom?: string | null; totalTimeLimitSeconds?: number | null },
) {
  const blueprint = state.blueprints.find((item) => item.id === blueprintId)
  if (!blueprint) {
    throw new Error('Không tìm thấy blueprint.')
  }
  const nextVersionNumber = blueprint.versions.length + 1
  const version: ExamBlueprintVersionDto = {
    code: `v${nextVersionNumber}`,
    description: null,
    effectiveFrom: payload.effectiveFrom ?? new Date().toISOString(),
    effectiveTo: null,
    id: genId('bpv'),
    sections: [],
    status: 'DRAFT',
    totalTimeLimitSeconds: payload.totalTimeLimitSeconds ?? null,
    version: nextVersionNumber,
  }
  blueprint.versions.push(version)
  return version
}

export function updateBlueprintVersionStatus(versionId: string, payload: UpdateExamBlueprintVersionStatusRequest) {
  const version = findBlueprintVersion(versionId)
  if (!version) {
    throw new Error('Không tìm thấy phiên bản blueprint.')
  }
  version.status = payload.action === 'PUBLISH' ? 'PUBLISHED' : 'ARCHIVED'
  return version
}

export function createBlueprintSection(
  versionId: string,
  payload: { instruction?: string | null; order: number; sectionTimeLimitSeconds?: number | null; sectionWeight?: number | null; title: string },
) {
  const version = findBlueprintVersion(versionId)
  if (!version) {
    throw new Error('Không tìm thấy phiên bản blueprint.')
  }
  const section: ExamBlueprintSectionDto = {
    id: genId('sec'),
    instruction: payload.instruction ?? null,
    order: payload.order,
    sectionTimeLimitSeconds: payload.sectionTimeLimitSeconds ?? null,
    sectionWeight: payload.sectionWeight ?? null,
    slots: [],
    title: payload.title,
  }
  version.sections.push(section)
  return section
}

function findBlueprintSection(sectionId: string): ExamBlueprintSectionDto | undefined {
  for (const blueprint of state.blueprints) {
    for (const version of blueprint.versions) {
      const section = version.sections.find((item) => item.id === sectionId)
      if (section) {
        return section
      }
    }
  }
  return undefined
}

export function updateBlueprintSection(
  sectionId: string,
  payload: { instruction?: string | null; order?: number; sectionTimeLimitSeconds?: number | null; sectionWeight?: number | null; title?: string },
) {
  const section = findBlueprintSection(sectionId)
  if (!section) {
    throw new Error('Không tìm thấy phần trong blueprint.')
  }
  if (payload.title !== undefined) section.title = payload.title
  if (payload.instruction !== undefined) section.instruction = payload.instruction
  if (payload.order !== undefined) section.order = payload.order
  if (payload.sectionTimeLimitSeconds !== undefined) section.sectionTimeLimitSeconds = payload.sectionTimeLimitSeconds
  if (payload.sectionWeight !== undefined) section.sectionWeight = payload.sectionWeight
  return section
}

export function deleteBlueprintSection(sectionId: string) {
  for (const blueprint of state.blueprints) {
    for (const version of blueprint.versions) {
      version.sections = version.sections.filter((section) => section.id !== sectionId)
    }
  }
}

export function createBlueprintSlot(
  sectionId: string,
  payload: Omit<ExamBlueprintSlotDto, 'id' | 'sectionId'>,
) {
  const section = findBlueprintSection(sectionId)
  if (!section) {
    throw new Error('Không tìm thấy phần trong blueprint.')
  }
  const slot: ExamBlueprintSlotDto = { ...payload, id: genId('slot'), sectionId }
  section.slots.push(slot)
  return slot
}

function findBlueprintSlot(slotId: string): ExamBlueprintSlotDto | undefined {
  for (const blueprint of state.blueprints) {
    for (const version of blueprint.versions) {
      for (const section of version.sections) {
        const slot = section.slots.find((item) => item.id === slotId)
        if (slot) {
          return slot
        }
      }
    }
  }
  return undefined
}

export function updateBlueprintSlot(slotId: string, payload: Partial<ExamBlueprintSlotDto>) {
  const slot = findBlueprintSlot(slotId)
  if (!slot) {
    throw new Error('Không tìm thấy ô câu hỏi.')
  }
  Object.assign(slot, payload)
  return slot
}

export function deleteBlueprintSlot(slotId: string) {
  for (const blueprint of state.blueprints) {
    for (const version of blueprint.versions) {
      for (const section of version.sections) {
        section.slots = section.slots.filter((slot) => slot.id !== slotId)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export function listCandidates(examId: string) {
  return state.candidates.filter((candidate) => candidate.examId === examId)
}

export function addCandidate(examId: string, input: { schoolClassId: string; schoolClassName: string; studentName: string }) {
  const existing = state.candidates.filter((candidate) => candidate.examId === examId)
  const nextSbd = String(100000 + existing.length + 1).padStart(6, '0')
  const candidate: ExamCandidateDto = {
    examId,
    id: genId('cand'),
    paperId: null,
    roomId: null,
    scheduleId: null,
    sbd: nextSbd,
    schoolClassId: input.schoolClassId,
    schoolClassName: input.schoolClassName,
    status: 'ASSIGNED',
    studentId: genId('student'),
    studentName: input.studentName,
  }
  state.candidates.push(candidate)
  return candidate
}

export function assignCandidateToRoom(candidateId: string, roomId: string, scheduleId: string) {
  const candidate = state.candidates.find((item) => item.id === candidateId)
  if (!candidate) {
    throw new Error('Không tìm thấy thí sinh.')
  }
  candidate.roomId = roomId
  candidate.scheduleId = scheduleId
  const room = state.rooms.find((item) => item.id === roomId)
  if (room) {
    room.occupied += 1
  }
  return candidate
}

export function removeCandidateFromRoom(candidateId: string) {
  const candidate = state.candidates.find((item) => item.id === candidateId)
  if (!candidate) {
    throw new Error('Không tìm thấy thí sinh.')
  }
  if (candidate.roomId) {
    const room = state.rooms.find((item) => item.id === candidate.roomId)
    if (room) {
      room.occupied = Math.max(0, room.occupied - 1)
    }
  }
  candidate.roomId = null
  return candidate
}

export function applyPaperAssignments(assignments: { candidateId: string; paperId: string }[]) {
  for (const { candidateId, paperId } of assignments) {
    const candidate = state.candidates.find((item) => item.id === candidateId)
    if (candidate) {
      candidate.paperId = paperId
    }
  }
  return assignments.length
}

export function autoFillRooms(examId: string, scheduleId: string) {
  const candidates = state.candidates.filter(
    (candidate) => candidate.examId === examId && candidate.scheduleId === scheduleId && !candidate.roomId,
  )
  const rooms = state.rooms.filter((room) => room.scheduleId === scheduleId)
  let roomIndex = 0
  for (const candidate of candidates) {
    while (roomIndex < rooms.length && rooms[roomIndex].occupied >= rooms[roomIndex].capacity) {
      roomIndex += 1
    }
    if (roomIndex >= rooms.length) {
      break
    }
    candidate.roomId = rooms[roomIndex].id
    rooms[roomIndex].occupied += 1
  }
  return candidates
}

// ---------------------------------------------------------------------------
// Schedules / rooms / proctors
// ---------------------------------------------------------------------------

export function listSchedules(examId: string) {
  return state.schedules.filter((schedule) => schedule.examId === examId)
}

export function listRooms(scheduleId: string) {
  return state.rooms.filter((room) => room.scheduleId === scheduleId)
}

export function listRoomsForExam(examId: string) {
  const scheduleIds = new Set(state.schedules.filter((schedule) => schedule.examId === examId).map((schedule) => schedule.id))
  return state.rooms.filter((room) => scheduleIds.has(room.scheduleId))
}

export function createSchedule(examId: string, payload: { endDate: string; label: string; startDate: string }) {
  const schedule: ExamScheduleDto = {
    candidateCount: 0,
    endDate: payload.endDate,
    examId,
    id: genId('sched'),
    label: payload.label,
    proctors: [],
    requiredProctorCount: 0,
    roomIds: [],
    startDate: payload.startDate,
    status: 'DRAFT',
  }
  state.schedules.push(schedule)
  return schedule
}

export function addRoomToSchedule(scheduleId: string, payload: { capacity: number; code: string }) {
  const room: ExamRoomDto = { capacity: payload.capacity, code: payload.code, id: genId('room'), occupied: 0, scheduleId }
  state.rooms.push(room)
  const schedule = state.schedules.find((item) => item.id === scheduleId)
  if (schedule) {
    schedule.roomIds = [...schedule.roomIds, room.id]
  }
  return room
}

export function addProctorToSchedule(scheduleId: string, payload: { teacherId: string; teacherName: string }) {
  const schedule = state.schedules.find((item) => item.id === scheduleId)
  if (!schedule) {
    throw new Error('Không tìm thấy ca thi.')
  }
  const proctor: ExamProctorDto = { id: genId('proc'), scheduleId, teacherId: payload.teacherId, teacherName: payload.teacherName }
  schedule.proctors = [...schedule.proctors, proctor]
  return proctor
}

export function removeProctorFromSchedule(scheduleId: string, proctorId: string) {
  const schedule = state.schedules.find((item) => item.id === scheduleId)
  if (!schedule) {
    return
  }
  schedule.proctors = schedule.proctors.filter((proctor) => proctor.id !== proctorId)
}
