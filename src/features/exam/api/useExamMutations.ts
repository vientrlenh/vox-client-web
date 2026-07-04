import { useMutation } from '@tanstack/react-query'
import {
  addCandidate,
  addExamMember,
  addProctorToSchedule,
  addRoomToSchedule,
  applyPaperAssignments,
  assignCandidateToRoom,
  attachExamBlueprint,
  autoFillRooms,
  createBlueprint,
  createBlueprintSection,
  createBlueprintSlot,
  createBlueprintVersion,
  createClassTest,
  createExam,
  createExamPaper,
  createSchedule,
  delay,
  deleteBlueprint,
  deleteBlueprintSection,
  deleteBlueprintSlot,
  deleteExam,
  deleteExamPaper,
  removeCandidateFromRoom,
  removeExamMember,
  removeProctorFromSchedule,
  setExamDeliveryMode,
  updateBlueprint,
  updateBlueprintSection,
  updateBlueprintSlot,
  updateBlueprintVersionStatus,
  updateClassTestQuestions,
  updateExam,
  updateExamMemberRole,
  updateExamPaperItem,
  updateExamPaperStatus,
  updateExamStatus,
} from '../mocks/store'
import type {
  CreateClassTestRequest,
  CreateExamBlueprintRequest,
  CreateExamMemberRequest,
  CreateExamRequest,
  ExamBlueprintSlotDto,
  ExamBlueprintSlotType,
  ExamDeliveryMode,
  ExamMemberRole,
  QuestionSelectionSpec,
  UpdateClassTestQuestionsRequest,
  UpdateExamBlueprintVersionStatusRequest,
  UpdateExamPaperItemRequest,
  UpdateExamPaperStatusRequest,
  UpdateExamRequest,
  UpdateExamStatusRequest,
} from '../types'

async function withDelay<T>(fn: () => T): Promise<T> {
  await delay(180)
  return fn()
}

export function useCreateExamMutation() {
  return useMutation({
    mutationFn: (payload: CreateExamRequest) => withDelay(() => createExam(payload)),
  })
}

export function useUpdateExamMutation() {
  return useMutation({
    mutationFn: ({ examId, payload }: { examId: string; payload: UpdateExamRequest }) =>
      withDelay(() => updateExam(examId, payload)),
  })
}

export function useUpdateExamStatusMutation() {
  return useMutation({
    mutationFn: ({ examId, payload }: { examId: string; payload: UpdateExamStatusRequest }) =>
      withDelay(() => updateExamStatus(examId, payload)),
  })
}

export function useDeleteExamMutation() {
  return useMutation({
    mutationFn: (examId: string) => withDelay(() => deleteExam(examId)),
  })
}

export function useAttachExamBlueprintMutation() {
  return useMutation({
    mutationFn: ({
      blueprintId,
      blueprintVersionId,
      examId,
    }: {
      blueprintId?: string | null
      blueprintVersionId?: string | null
      examId: string
    }) => withDelay(() => attachExamBlueprint(examId, blueprintId ?? null, blueprintVersionId ?? null)),
  })
}

export function useSetExamDeliveryModeMutation() {
  return useMutation({
    mutationFn: ({ deliveryMode, examId }: { deliveryMode: ExamDeliveryMode; examId: string }) =>
      withDelay(() => setExamDeliveryMode(examId, deliveryMode)),
  })
}

export function useCreateExamMemberMutation() {
  return useMutation({
    mutationFn: ({
      examId,
      payload,
    }: {
      examId: string
      payload: CreateExamMemberRequest & { email?: string; fullName?: string }
    }) => withDelay(() => addExamMember(examId, payload)),
  })
}

export function useUpdateExamMemberMutation() {
  return useMutation({
    mutationFn: ({ examId, memberId, role }: { examId: string; memberId: string; role: ExamMemberRole }) =>
      withDelay(() => updateExamMemberRole(examId, memberId, role)),
  })
}

export function useDeleteExamMemberMutation() {
  return useMutation({
    mutationFn: ({ examId, memberId }: { examId: string; memberId: string }) =>
      withDelay(() => removeExamMember(examId, memberId)),
  })
}

export function useCreateExamPaperMutation() {
  return useMutation({
    mutationFn: (examId: string) => withDelay(() => createExamPaper(examId)),
  })
}

export function useUpdateExamPaperItemMutation() {
  return useMutation({
    mutationFn: ({
      itemId,
      paperId,
      payload,
    }: {
      itemId: string
      paperId: string
      payload: UpdateExamPaperItemRequest
    }) => withDelay(() => updateExamPaperItem(paperId, itemId, payload)),
  })
}

export function useUpdateExamPaperStatusMutation() {
  return useMutation({
    mutationFn: ({ paperId, payload }: { paperId: string; payload: UpdateExamPaperStatusRequest }) =>
      withDelay(() => updateExamPaperStatus(paperId, payload)),
  })
}

export function useDeleteExamPaperMutation() {
  return useMutation({
    mutationFn: (paperId: string) => withDelay(() => deleteExamPaper(paperId)),
  })
}

export function useCreateBlueprintMutation() {
  return useMutation({
    mutationFn: (payload: CreateExamBlueprintRequest) => withDelay(() => createBlueprint(payload)),
  })
}

export function useUpdateBlueprintMutation() {
  return useMutation({
    mutationFn: ({ blueprintId, payload }: { blueprintId: string; payload: { description?: string | null; name?: string } }) =>
      withDelay(() => updateBlueprint(blueprintId, payload)),
  })
}

export function useDeleteBlueprintMutation() {
  return useMutation({
    mutationFn: (blueprintId: string) => withDelay(() => deleteBlueprint(blueprintId)),
  })
}

export function useCreateBlueprintVersionMutation() {
  return useMutation({
    mutationFn: ({
      blueprintId,
      payload,
    }: {
      blueprintId: string
      payload: { effectiveFrom?: string | null; totalTimeLimitSeconds?: number | null }
    }) => withDelay(() => createBlueprintVersion(blueprintId, payload)),
  })
}

export function useUpdateBlueprintVersionStatusMutation() {
  return useMutation({
    mutationFn: ({ payload, versionId }: { payload: UpdateExamBlueprintVersionStatusRequest; versionId: string }) =>
      withDelay(() => updateBlueprintVersionStatus(versionId, payload)),
  })
}

export function useCreateBlueprintSectionMutation() {
  return useMutation({
    mutationFn: ({
      payload,
      versionId,
    }: {
      payload: { instruction?: string | null; order: number; sectionTimeLimitSeconds?: number | null; sectionWeight?: number | null; title: string }
      versionId: string
    }) => withDelay(() => createBlueprintSection(versionId, payload)),
  })
}

export function useUpdateBlueprintSectionMutation() {
  return useMutation({
    mutationFn: ({
      payload,
      sectionId,
    }: {
      payload: { instruction?: string | null; order?: number; sectionTimeLimitSeconds?: number | null; sectionWeight?: number | null; title?: string }
      sectionId: string
    }) => withDelay(() => updateBlueprintSection(sectionId, payload)),
  })
}

export function useDeleteBlueprintSectionMutation() {
  return useMutation({
    mutationFn: (sectionId: string) => withDelay(() => deleteBlueprintSection(sectionId)),
  })
}

export function useCreateBlueprintSlotMutation() {
  return useMutation({
    mutationFn: ({
      payload,
      sectionId,
    }: {
      payload: {
        fixedQuestionId?: string | null
        order: number
        prepTimeSecondsOverride?: number | null
        responseTimeSecondsOverride?: number | null
        selectionSpec?: QuestionSelectionSpec | null
        slotType: ExamBlueprintSlotType
        weight?: number | null
      }
      sectionId: string
    }) => withDelay(() => createBlueprintSlot(sectionId, payload)),
  })
}

export function useUpdateBlueprintSlotMutation() {
  return useMutation({
    mutationFn: ({ payload, slotId }: { payload: Partial<ExamBlueprintSlotDto>; slotId: string }) =>
      withDelay(() => updateBlueprintSlot(slotId, payload)),
  })
}

export function useDeleteBlueprintSlotMutation() {
  return useMutation({
    mutationFn: (slotId: string) => withDelay(() => deleteBlueprintSlot(slotId)),
  })
}

export function useCreateClassTestMutation() {
  return useMutation({
    mutationFn: ({ payload, schoolClassName }: { payload: CreateClassTestRequest; schoolClassName: string }) =>
      withDelay(() => createClassTest(payload, schoolClassName)),
  })
}

export function useUpdateClassTestMutation() {
  return useMutation({
    mutationFn: ({ examId, payload }: { examId: string; payload: UpdateExamRequest }) =>
      withDelay(() => updateExam(examId, payload)),
  })
}

export function useUpdateClassTestQuestionsMutation() {
  return useMutation({
    mutationFn: ({ examId, payload }: { examId: string; payload: UpdateClassTestQuestionsRequest }) =>
      withDelay(() => updateClassTestQuestions(examId, payload.questionIds)),
  })
}

export function useUpdateClassTestStatusMutation() {
  return useMutation({
    mutationFn: ({ examId, payload }: { examId: string; payload: UpdateExamStatusRequest }) =>
      withDelay(() => updateExamStatus(examId, payload)),
  })
}

export function useDeleteClassTestMutation() {
  return useMutation({
    mutationFn: (examId: string) => withDelay(() => deleteExam(examId)),
  })
}

export function useAddCandidateMutation() {
  return useMutation({
    mutationFn: ({
      examId,
      payload,
    }: {
      examId: string
      payload: { schoolClassId: string; schoolClassName: string; studentName: string }
    }) => withDelay(() => addCandidate(examId, payload)),
  })
}

export function useAssignCandidateToRoomMutation() {
  return useMutation({
    mutationFn: ({ candidateId, roomId, scheduleId }: { candidateId: string; roomId: string; scheduleId: string }) =>
      withDelay(() => assignCandidateToRoom(candidateId, roomId, scheduleId)),
  })
}

export function useRemoveCandidateFromRoomMutation() {
  return useMutation({
    mutationFn: ({ candidateId }: { candidateId: string }) => withDelay(() => removeCandidateFromRoom(candidateId)),
  })
}

export function useApplyPaperAssignmentsMutation() {
  return useMutation({
    mutationFn: (assignments: { candidateId: string; paperId: string }[]) =>
      withDelay(() => applyPaperAssignments(assignments)),
  })
}

export function useAutoFillRoomsMutation() {
  return useMutation({
    mutationFn: ({ examId, scheduleId }: { examId: string; scheduleId: string }) =>
      withDelay(() => autoFillRooms(examId, scheduleId)),
  })
}

export function useCreateScheduleMutation() {
  return useMutation({
    mutationFn: ({ examId, payload }: { examId: string; payload: { endDate: string; label: string; startDate: string } }) =>
      withDelay(() => createSchedule(examId, payload)),
  })
}

export function useAddRoomToScheduleMutation() {
  return useMutation({
    mutationFn: ({ payload, scheduleId }: { payload: { capacity: number; code: string }; scheduleId: string }) =>
      withDelay(() => addRoomToSchedule(scheduleId, payload)),
  })
}

export function useAddProctorToScheduleMutation() {
  return useMutation({
    mutationFn: ({ payload, scheduleId }: { payload: { teacherId: string; teacherName: string }; scheduleId: string }) =>
      withDelay(() => addProctorToSchedule(scheduleId, payload)),
  })
}

export function useRemoveProctorFromScheduleMutation() {
  return useMutation({
    mutationFn: ({ proctorId, scheduleId }: { proctorId: string; scheduleId: string }) =>
      withDelay(() => removeProctorFromSchedule(scheduleId, proctorId)),
  })
}
