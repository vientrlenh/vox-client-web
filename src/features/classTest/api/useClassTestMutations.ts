import { useMutation } from '@tanstack/react-query'
import { type ApiResponse, apiClient } from '@/shared/api'
import { unwrap } from '@/features/examCore/api/mutations'
import type { ExamDto, UpdateExamRequest, UpdateExamStatusRequest } from '@/features/examCore/types'
import type {
  ChangeClassTestBlueprintRequest,
  ClassTestSectionInput,
  CreateClassTestRequest,
  CreateClassTestResponse,
  UpdateClassTestQuestionsRequest,
} from '../types'

function normalizeSections(
  payload:
    | { name?: string; questionIds?: string[] | null; sections?: ClassTestSectionInput[] | null }
    | { questionIds?: string[]; sections?: ClassTestSectionInput[] }
    | undefined,
) {
  if (payload?.sections?.length) {
    return payload.sections
  }

  if (payload?.questionIds?.length) {
    const title =
      payload && 'name' in payload && typeof payload.name === 'string' && payload.name.trim()
        ? payload.name.trim()
        : 'Phan 1'

    return [
      {
        questionIds: payload.questionIds,
        title,
      },
    ]
  }

  return undefined
}

export function useCreateClassTestMutation() {
  return useMutation({
    mutationFn: async ({ payload }: { payload: CreateClassTestRequest; schoolClassName?: string }) => {
      const response = await apiClient.post<ApiResponse<CreateClassTestResponse>>('/v1/class-tests', {
        ...payload,
        sections: normalizeSections(payload),
      })
      return unwrap(response)
    },
  })
}

export function useUpdateClassTestMutation() {
  return useMutation({
    mutationFn: async ({ examId, payload }: { examId: string; payload: UpdateExamRequest }) => {
      const response = await apiClient.put<ApiResponse<ExamDto>>(`/v1/class-tests/${examId}`, payload)
      return unwrap(response)
    },
  })
}

export function useChangeClassTestBlueprintMutation() {
  return useMutation({
    mutationFn: async ({ examId, payload }: { examId: string; payload: ChangeClassTestBlueprintRequest }) => {
      const response = await apiClient.patch<ApiResponse<ExamDto>>(`/v1/class-tests/${examId}/blueprint`, payload)
      return unwrap(response)
    },
  })
}

export function useUpdateClassTestQuestionsMutation() {
  return useMutation({
    mutationFn: async ({ examId, payload }: { examId: string; payload: UpdateClassTestQuestionsRequest }) => {
      const response = await apiClient.put<ApiResponse<ExamDto>>(`/v1/class-tests/${examId}/questions`, {
        sections: normalizeSections(payload),
      })
      return unwrap(response)
    },
  })
}

export function useCreateClassTestSectionMutation() {
  return useMutation({
    mutationFn: async ({ examId, payload }: { examId: string; payload: ClassTestSectionInput }) => {
      const response = await apiClient.post<ApiResponse<ExamDto>>(`/v1/class-tests/${examId}/sections`, payload)
      return unwrap(response)
    },
  })
}

export function useUpdateClassTestSectionMutation() {
  return useMutation({
    mutationFn: async ({ examId, payload, sectionId }: { examId: string; payload: Partial<ClassTestSectionInput>; sectionId: string }) => {
      const response = await apiClient.put<ApiResponse<ExamDto>>(`/v1/class-tests/${examId}/sections/${sectionId}`, payload)
      return unwrap(response)
    },
  })
}

export function useDeleteClassTestSectionMutation() {
  return useMutation({
    mutationFn: async ({ examId, sectionId }: { examId: string; sectionId: string }) => {
      const response = await apiClient.delete<ApiResponse<ExamDto>>(`/v1/class-tests/${examId}/sections/${sectionId}`)
      return unwrap(response)
    },
  })
}

export function useUpdateClassTestStatusMutation() {
  return useMutation({
    mutationFn: async ({ examId, payload }: { examId: string; payload: UpdateExamStatusRequest }) => {
      const response = await apiClient.patch<ApiResponse<ExamDto>>(`/v1/class-tests/${examId}/status`, payload)
      return unwrap(response)
    },
  })
}

export function useDeleteClassTestMutation() {
  return useMutation({
    mutationFn: async (examId: string) => {
      await apiClient.delete<ApiResponse<unknown>>(`/v1/class-tests/${examId}`)
      return examId
    },
  })
}
