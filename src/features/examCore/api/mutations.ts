import { useMutation } from '@tanstack/react-query'
import { type ApiResponse, apiClient } from '@/shared/api'
import type {
  CreateExamBlueprintRequest,
  CreateExamPaperRequest,
  ExamBlueprintDto,
  ExamBlueprintSectionDto,
  ExamBlueprintSlotDto,
  ExamBlueprintSlotType,
  ExamBlueprintVersionDto,
  ExamDeliveryMode,
  ExamPaperDto,
  ExamPaperItemDto,
  ExamPaperSectionDto,
  QuestionSelectionSpec,
  UpdateExamBlueprintVersionStatusRequest,
  UpdateExamPaperItemRequest,
  UpdateExamPaperSectionRequest,
  UpdateExamPaperStatusRequest,
} from '../types'

export function unwrap<T>(response: { data: ApiResponse<T> }) {
  return response.data.data
}

export function useSetExamDeliveryModeMutation() {
  return useMutation({
    mutationFn: async ({ deliveryMode, examId }: { deliveryMode: ExamDeliveryMode; examId: string }) => ({
      deliveryMode,
      examId,
    }),
  })
}

export function useCreateExamPaperMutation() {
  return useMutation({
    mutationFn: async (input: string | { examId: string; payload?: CreateExamPaperRequest | null }) => {
      const examId = typeof input === 'string' ? input : input.examId
      const payload = typeof input === 'string' ? undefined : input.payload
      const response = await apiClient.post<ApiResponse<ExamPaperDto>>(`/v1/exams/${examId}/papers`, payload ?? undefined)
      return unwrap(response)
    },
  })
}

export function useUpdateExamPaperItemMutation() {
  return useMutation({
    mutationFn: async ({
      itemId,
      paperId,
      payload,
    }: {
      itemId: string
      paperId: string
      payload: UpdateExamPaperItemRequest
    }) => {
      const response = await apiClient.put<ApiResponse<ExamPaperItemDto>>(`/v1/exam-papers/${paperId}/items/${itemId}`, payload)
      return unwrap(response)
    },
  })
}

export function useUpdateExamPaperSectionMutation() {
  return useMutation({
    mutationFn: async ({
      paperId,
      payload,
      sectionId,
    }: {
      paperId: string
      payload: UpdateExamPaperSectionRequest
      sectionId: string
    }) => {
      const response = await apiClient.patch<ApiResponse<ExamPaperSectionDto>>(
        `/v1/exam-papers/${paperId}/sections/${sectionId}`,
        payload,
      )
      return unwrap(response)
    },
  })
}

export function useUpdateExamPaperStatusMutation() {
  return useMutation({
    mutationFn: async ({ paperId, payload }: { paperId: string; payload: UpdateExamPaperStatusRequest }) => {
      const response = await apiClient.patch<ApiResponse<ExamPaperDto>>(`/v1/exam-papers/${paperId}/status`, payload)
      return unwrap(response)
    },
  })
}

export function useDeleteExamPaperMutation() {
  return useMutation({
    mutationFn: async (paperId: string) => {
      await apiClient.delete<ApiResponse<unknown>>(`/v1/exam-papers/${paperId}`)
      return paperId
    },
  })
}

export function useCreateBlueprintMutation() {
  return useMutation({
    mutationFn: async (payload: CreateExamBlueprintRequest) => {
      const response = await apiClient.post<ApiResponse<ExamBlueprintDto>>('/v1/exam-blueprints', payload)
      return unwrap(response)
    },
  })
}

export function useUpdateBlueprintMutation() {
  return useMutation({
    mutationFn: async ({ blueprintId, payload }: { blueprintId: string; payload: { description?: string | null; name?: string } }) => {
      const response = await apiClient.put<ApiResponse<ExamBlueprintDto>>(`/v1/exam-blueprints/${blueprintId}`, payload)
      return unwrap(response)
    },
  })
}

export function useDeleteBlueprintMutation() {
  return useMutation({
    mutationFn: async (blueprintId: string) => {
      await apiClient.delete<ApiResponse<unknown>>(`/v1/exam-blueprints/${blueprintId}`)
      return blueprintId
    },
  })
}

export type CreateBlueprintVersionSlotInput = {
  fixedQuestionId?: string | null
  order: number
  prepTimeSecondsOverride?: number | null
  responseTimeSecondsOverride?: number | null
  selectionSpec?: QuestionSelectionSpec | null
  slotType: ExamBlueprintSlotType
  weight?: number | null
}

export type CreateBlueprintVersionSectionInput = {
  instruction?: string | null
  order: number
  sectionTimeLimitSeconds?: number | null
  sectionWeight?: number | null
  slots: CreateBlueprintVersionSlotInput[]
  title: string
}

export function useCreateBlueprintVersionMutation() {
  return useMutation({
    mutationFn: async ({
      blueprintId,
      payload,
    }: {
      blueprintId: string
      payload: {
        effectiveFrom?: string | null
        effectiveTo?: string | null
        sections: CreateBlueprintVersionSectionInput[]
        totalTimeLimitSeconds?: number | null
      }
    }) => {
      const response = await apiClient.post<ApiResponse<ExamBlueprintVersionDto>>(`/v1/exam-blueprints/${blueprintId}/versions`, payload)
      return unwrap(response)
    },
  })
}

export type UpdateBlueprintVersionSlotInput = CreateBlueprintVersionSlotInput & { id?: string | null }
export type UpdateBlueprintVersionSectionInput = Omit<CreateBlueprintVersionSectionInput, 'slots'> & {
  id?: string | null
  slots: UpdateBlueprintVersionSlotInput[]
}

export function useUpdateBlueprintVersionMutation() {
  return useMutation({
    mutationFn: async ({
      payload,
      versionId,
    }: {
      payload: {
        description?: string | null
        effectiveFrom?: string | null
        effectiveTo?: string | null
        sections: UpdateBlueprintVersionSectionInput[]
        totalTimeLimitSeconds?: number | null
      }
      versionId: string
    }) => {
      const response = await apiClient.put<ApiResponse<ExamBlueprintVersionDto>>(`/v1/exam-blueprint-versions/${versionId}`, payload)
      return unwrap(response)
    },
  })
}

export function useDuplicateBlueprintVersionMutation() {
  return useMutation({
    mutationFn: async (versionId: string) => {
      const response = await apiClient.post<ApiResponse<ExamBlueprintVersionDto>>(`/v1/exam-blueprint-versions/${versionId}/duplicate`)
      return unwrap(response)
    },
  })
}

export function useUpdateBlueprintVersionStatusMutation() {
  return useMutation({
    mutationFn: async ({ payload, versionId }: { payload: UpdateExamBlueprintVersionStatusRequest; versionId: string }) => {
      const response = await apiClient.patch<ApiResponse<ExamBlueprintVersionDto>>(`/v1/exam-blueprint-versions/${versionId}/status`, payload)
      return unwrap(response)
    },
  })
}

export function useDeleteBlueprintVersionMutation() {
  return useMutation({
    mutationFn: async (versionId: string) => {
      await apiClient.delete<ApiResponse<unknown>>(`/v1/exam-blueprint-versions/${versionId}`)
      return versionId
    },
  })
}

export function useCreateBlueprintSectionMutation() {
  return useMutation({
    mutationFn: async ({
      payload,
      versionId,
    }: {
      payload: { instruction?: string | null; order: number; sectionTimeLimitSeconds?: number | null; sectionWeight?: number | null; title: string }
      versionId: string
    }) => {
      const response = await apiClient.post<ApiResponse<ExamBlueprintSectionDto>>(`/v1/exam-blueprint-versions/${versionId}/sections`, payload)
      return unwrap(response)
    },
  })
}

export function useUpdateBlueprintSectionMutation() {
  return useMutation({
    mutationFn: async ({
      payload,
      sectionId,
    }: {
      payload: { instruction?: string | null; order?: number; sectionTimeLimitSeconds?: number | null; sectionWeight?: number | null; title?: string }
      sectionId: string
    }) => {
      const response = await apiClient.put<ApiResponse<ExamBlueprintSectionDto>>(`/v1/exam-blueprint-sections/${sectionId}`, payload)
      return unwrap(response)
    },
  })
}

export function useDeleteBlueprintSectionMutation() {
  return useMutation({
    mutationFn: async (sectionId: string) => {
      await apiClient.delete<ApiResponse<unknown>>(`/v1/exam-blueprint-sections/${sectionId}`)
      return sectionId
    },
  })
}

export function useCreateBlueprintSlotMutation() {
  return useMutation({
    mutationFn: async ({
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
    }) => {
      const response = await apiClient.post<ApiResponse<ExamBlueprintSlotDto>>(`/v1/exam-blueprint-sections/${sectionId}/slots`, payload)
      return unwrap(response)
    },
  })
}

export function useUpdateBlueprintSlotMutation() {
  return useMutation({
    mutationFn: async ({ payload, slotId }: { payload: Partial<ExamBlueprintSlotDto>; slotId: string }) => {
      const response = await apiClient.put<ApiResponse<ExamBlueprintSlotDto>>(`/v1/exam-blueprint-slots/${slotId}`, payload)
      return unwrap(response)
    },
  })
}

export function useDeleteBlueprintSlotMutation() {
  return useMutation({
    mutationFn: async (slotId: string) => {
      await apiClient.delete<ApiResponse<unknown>>(`/v1/exam-blueprint-slots/${slotId}`)
      return slotId
    },
  })
}

export function useAddCandidateMutation() {
  return useMutation({
    mutationFn: async ({
      examId,
      payload,
    }: {
      examId: string
      payload: { schoolClassId: string; schoolClassName: string; studentName: string }
    }) => ({ examId, payload }),
  })
}

export function useAssignCandidateToRoomMutation() {
  return useMutation({
    mutationFn: async ({ candidateId, roomId, scheduleId }: { candidateId: string; roomId: string; scheduleId: string }) => ({
      candidateId,
      roomId,
      scheduleId,
    }),
  })
}

export function useRemoveCandidateFromRoomMutation() {
  return useMutation({
    mutationFn: async ({ candidateId }: { candidateId: string }) => candidateId,
  })
}

export function useApplyPaperAssignmentsMutation() {
  return useMutation({
    mutationFn: async (assignments: { candidateId: string; paperId: string }[]) => assignments,
  })
}

export function useAutoFillRoomsMutation() {
  return useMutation({
    mutationFn: async ({ examId, scheduleId }: { examId: string; scheduleId: string }) => ({ examId, scheduleId }),
  })
}

export function useCreateScheduleMutation() {
  return useMutation({
    mutationFn: async ({ examId, payload }: { examId: string; payload: { endDate: string; label: string; startDate: string } }) => ({
      examId,
      payload,
    }),
  })
}

export function useAddRoomToScheduleMutation() {
  return useMutation({
    mutationFn: async ({ payload, scheduleId }: { payload: { capacity: number; code: string }; scheduleId: string }) => ({
      payload,
      scheduleId,
    }),
  })
}

export function useAddProctorToScheduleMutation() {
  return useMutation({
    mutationFn: async ({ payload, scheduleId }: { payload: { teacherId: string; teacherName: string }; scheduleId: string }) => ({
      payload,
      scheduleId,
    }),
  })
}

export function useRemoveProctorFromScheduleMutation() {
  return useMutation({
    mutationFn: async ({ proctorId, scheduleId }: { proctorId: string; scheduleId: string }) => ({
      proctorId,
      scheduleId,
    }),
  })
}
