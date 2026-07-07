import { useMutation } from '@tanstack/react-query'
import { type ApiResponse, apiClient } from '@/shared/api'
import { unwrap } from '@/features/examCore/api/mutations'
import type { ExamDto, ExamMemberDto, ExamMemberRole, UpdateExamRequest, UpdateExamStatusRequest } from '@/features/examCore/types'
import type { AttachExamBlueprintRequest, CreateBlueprintInlineRequest, CreateExamMemberRequest, CreateExamRequest } from '../types'

export function useCreateExamMutation() {
  return useMutation({
    mutationFn: async (payload: CreateExamRequest) => {
      const response = await apiClient.post<ApiResponse<ExamDto>>('/v1/exams', payload)
      return unwrap(response)
    },
  })
}

export function useUpdateExamMutation() {
  return useMutation({
    mutationFn: async ({ examId, payload }: { examId: string; payload: UpdateExamRequest }) => {
      const response = await apiClient.put<ApiResponse<ExamDto>>(`/v1/exams/${examId}`, payload)
      return unwrap(response)
    },
  })
}

export function useUpdateExamStatusMutation() {
  return useMutation({
    mutationFn: async ({ examId, payload }: { examId: string; payload: UpdateExamStatusRequest }) => {
      const response = await apiClient.patch<ApiResponse<ExamDto>>(`/v1/exams/${examId}/status`, payload)
      return unwrap(response)
    },
  })
}

export function useDeleteExamMutation() {
  return useMutation({
    mutationFn: async (examId: string) => {
      await apiClient.delete<ApiResponse<unknown>>(`/v1/exams/${examId}`)
      return examId
    },
  })
}

export function useAttachExamBlueprintMutation() {
  return useMutation({
    mutationFn: async (
      input:
        | { examId: string; payload: AttachExamBlueprintRequest }
        | { blueprintId?: string | null; blueprintVersionId?: string | null; examId: string; newBlueprint?: CreateBlueprintInlineRequest | null },
    ) => {
      const examId = input.examId
      const payload = 'payload' in input
        ? input.payload
        : {
            blueprintId: input.blueprintId,
            blueprintVersionId: input.blueprintVersionId,
            newBlueprint: input.newBlueprint,
          }
      const response = await apiClient.patch<ApiResponse<ExamDto>>(`/v1/exams/${examId}/blueprint`, payload)
      return unwrap(response)
    },
  })
}

export function useCreateExamMemberMutation() {
  return useMutation({
    mutationFn: async ({
      examId,
      payload,
    }: {
      examId: string
      payload: CreateExamMemberRequest & { email?: string; fullName?: string }
    }) => {
      const response = await apiClient.post<ApiResponse<ExamMemberDto>>(`/v1/exams/${examId}/members`, {
        role: payload.role,
        userId: payload.userId,
      })
      return unwrap(response)
    },
  })
}

export function useUpdateExamMemberMutation() {
  return useMutation({
    mutationFn: async ({ examId, memberId, role }: { examId: string; memberId: string; role: ExamMemberRole }) => {
      const response = await apiClient.put<ApiResponse<ExamMemberDto>>(`/v1/exams/${examId}/members/${memberId}`, { role })
      return unwrap(response)
    },
  })
}

export function useDeleteExamMemberMutation() {
  return useMutation({
    mutationFn: async ({ examId, memberId }: { examId: string; memberId: string }) => {
      await apiClient.delete<ApiResponse<unknown>>(`/v1/exams/${examId}/members/${memberId}`)
      return memberId
    },
  })
}
