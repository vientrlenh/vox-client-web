import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type {
  CreateClassTestRequest,
  CreateExamBlueprintRequest,
  CreateExamBlueprintVersionRequest,
  CreateExamMemberRequest,
  CreateExamRequest,
  UpdateClassTestQuestionsRequest,
  UpdateExamBlueprintRequest,
  UpdateExamBlueprintVersionStatusRequest,
  UpdateExamMemberRequest,
  UpdateExamPaperItemRequest,
  UpdateExamPaperStatusRequest,
  UpdateExamRequest,
  UpdateExamStatusRequest,
} from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

export function useCreateExamMutation() {
  return useMutation({
    mutationFn: async (payload: CreateExamRequest) =>
      (await apiClient.post<ApiResponse<unknown>>('/v1/exams', payload)).data.message,
  })
}

export function useUpdateExamMutation() {
  return useMutation({
    mutationFn: async ({ examId, payload }: { examId: string; payload: UpdateExamRequest }) =>
      (await apiClient.put<ApiResponse<unknown>>(`/v1/exams/${examId}`, payload)).data.message,
  })
}

export function useUpdateExamStatusMutation() {
  return useMutation({
    mutationFn: async ({ examId, payload }: { examId: string; payload: UpdateExamStatusRequest }) =>
      (await apiClient.patch<ApiResponse<unknown>>(`/v1/exams/${examId}/status`, payload)).data.message,
  })
}

export function useDeleteExamMutation() {
  return useMutation({
    mutationFn: async (examId: string) =>
      (await apiClient.delete<ApiResponse<unknown>>(`/v1/exams/${examId}`)).data.message,
  })
}

export function useCreateExamMemberMutation() {
  return useMutation({
    mutationFn: async ({ examId, payload }: { examId: string; payload: CreateExamMemberRequest }) =>
      (await apiClient.post<ApiResponse<unknown>>(`/v1/exams/${examId}/members`, payload)).data.message,
  })
}

export function useUpdateExamMemberMutation() {
  return useMutation({
    mutationFn: async ({
      examId,
      memberId,
      payload,
    }: {
      examId: string
      memberId: string
      payload: UpdateExamMemberRequest
    }) =>
      (await apiClient.put<ApiResponse<unknown>>(`/v1/exams/${examId}/members/${memberId}`, payload)).data.message,
  })
}

export function useDeleteExamMemberMutation() {
  return useMutation({
    mutationFn: async ({ examId, memberId }: { examId: string; memberId: string }) =>
      (await apiClient.delete<ApiResponse<unknown>>(`/v1/exams/${examId}/members/${memberId}`)).data.message,
  })
}

export function useCreateExamPaperMutation() {
  return useMutation({
    mutationFn: async (examId: string) =>
      (await apiClient.post<ApiResponse<unknown>>(`/v1/exams/${examId}/papers`, {})).data.message,
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
    }) =>
      (await apiClient.put<ApiResponse<unknown>>(`/v1/exam-papers/${paperId}/items/${itemId}`, payload)).data.message,
  })
}

export function useUpdateExamPaperStatusMutation() {
  return useMutation({
    mutationFn: async ({
      paperId,
      payload,
    }: {
      paperId: string
      payload: UpdateExamPaperStatusRequest
    }) =>
      (await apiClient.patch<ApiResponse<unknown>>(`/v1/exam-papers/${paperId}/status`, payload)).data.message,
  })
}

export function useDeleteExamPaperMutation() {
  return useMutation({
    mutationFn: async (paperId: string) =>
      (await apiClient.delete<ApiResponse<unknown>>(`/v1/exam-papers/${paperId}`)).data.message,
  })
}

export function useCreateBlueprintMutation() {
  return useMutation({
    mutationFn: async (payload: CreateExamBlueprintRequest) =>
      (await apiClient.post<ApiResponse<unknown>>('/v1/exam-blueprints', payload)).data.message,
  })
}

export function useUpdateBlueprintMutation() {
  return useMutation({
    mutationFn: async ({ blueprintId, payload }: { blueprintId: string; payload: UpdateExamBlueprintRequest }) =>
      (await apiClient.put<ApiResponse<unknown>>(`/v1/exam-blueprints/${blueprintId}`, payload)).data.message,
  })
}

export function useDeleteBlueprintMutation() {
  return useMutation({
    mutationFn: async (blueprintId: string) =>
      (await apiClient.delete<ApiResponse<unknown>>(`/v1/exam-blueprints/${blueprintId}`)).data.message,
  })
}

export function useCreateBlueprintVersionMutation() {
  return useMutation({
    mutationFn: async ({
      blueprintId,
      payload,
    }: {
      blueprintId: string
      payload: CreateExamBlueprintVersionRequest
    }) =>
      (await apiClient.post<ApiResponse<unknown>>(`/v1/exam-blueprints/${blueprintId}/versions`, payload)).data.message,
  })
}

export function useUpdateBlueprintVersionStatusMutation() {
  return useMutation({
    mutationFn: async ({
      payload,
      versionId,
    }: {
      payload: UpdateExamBlueprintVersionStatusRequest
      versionId: string
    }) =>
      (await apiClient.patch<ApiResponse<unknown>>(`/v1/exam-blueprint-versions/${versionId}/status`, payload)).data.message,
  })
}

export function useCreateClassTestMutation() {
  return useMutation({
    mutationFn: async (payload: CreateClassTestRequest) =>
      (await apiClient.post<ApiResponse<unknown>>('/v1/class-tests', payload)).data.message,
  })
}

export function useUpdateClassTestMutation() {
  return useMutation({
    mutationFn: async ({ examId, payload }: { examId: string; payload: UpdateExamRequest }) =>
      (await apiClient.put<ApiResponse<unknown>>(`/v1/class-tests/${examId}`, payload)).data.message,
  })
}

export function useUpdateClassTestQuestionsMutation() {
  return useMutation({
    mutationFn: async ({
      examId,
      payload,
    }: {
      examId: string
      payload: UpdateClassTestQuestionsRequest
    }) =>
      (await apiClient.put<ApiResponse<unknown>>(`/v1/class-tests/${examId}/questions`, payload)).data.message,
  })
}

export function useUpdateClassTestStatusMutation() {
  return useMutation({
    mutationFn: async ({ examId, payload }: { examId: string; payload: UpdateExamStatusRequest }) =>
      (await apiClient.patch<ApiResponse<unknown>>(`/v1/class-tests/${examId}/status`, payload)).data.message,
  })
}

export function useDeleteClassTestMutation() {
  return useMutation({
    mutationFn: async (examId: string) =>
      (await apiClient.delete<ApiResponse<unknown>>(`/v1/class-tests/${examId}`)).data.message,
  })
}
